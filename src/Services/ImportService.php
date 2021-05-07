<?php
namespace ICARICCU\PEB\Services;

use ICARICCU\PEB\Services\OwlTransformers\ClassTransformer;
use ICARICCU\PEB\Services\OwlTransformers\OntologyTransformer;
use Ramsey\Uuid\Uuid;

class ImportService
{
    private $xpath;
    private $namespaces;
    private $ontologyUri;

    /**
     * @var ICARICCU\PEB\Services\StorageService
     */
    private $storageService;

    /**
     * @var ICARICCU\PEB\Services\ReadStorageService
     */
    private $readStorageService;
    private $topDomainOntology;

    private $classTransformer;
    /**
     * @param ICARICCU\PEB\Services\StorageService $storageService
     * @param ICARICCU\PEB\Services\ReadStorageService $readStorageService
     */
    public function __construct(StorageService $storageService, ReadStorageService $readStorageService)
    {
        $this->storageService = $storageService;
        $this->readStorageService = $readStorageService;
        $this->topDomainOntology = $this->getTopDomainOntology();
    }


    /**
     * @param string $file
     * @return void
     */
    public function import($file, $ontologyId = null)
    {
        ini_set('max_execution_time', 0);
        //TODO rimuovere a regime, utile per i dati di demo
        \__Session::set('userImport',(int)\__Request::get('userImport',1));
        // ///
        $this->isValid($file);

        $pathInfo = pathinfo($file);
        if ($pathInfo['extension']==='json') {
            $this->parseJson($file);
            return;
        }
        
        $this->parseXml($file);
        return $this->convertClassDefinition($ontologyId);
    }

    /**
     * @param string $file
     * @return void
     */
    private function parseXml($file)
    {
        $xml = new \DomDocument();
        $xml->load($file);

        $this->namespaces = simplexml_import_dom($xml)->getDocNamespaces();

        $this->xpath = new \DOMXPath($xml);
    }

    /**
     * @return string $ontologyId
     */
    private function convertClassDefinition($ontologyId = null)
    {
        //Creazione ontologia
        if(!$ontologyId){
            $transformer = new OntologyTransformer();
            $ontology = $transformer->transform(null, $this->xpath, $this->namespaces, null);
            $this->storageService->storeOntology($ontology, \__Session::get('userImport'));
        }
        else{
            $ontology = $this->readStorageService->getOntology($ontologyId, 1);
        }
        $this->ontologyUri = $ontology->uri;

        //Estrazione entità
        $owlClass = $this->xpath->query("owl:Class");
        $this->classTransformer = new ClassTransformer((string)$ontology->id, $ontology->name);

        //Estrazione contenuti
        $namedIndividual = $this->xpath->query("owl:NamedIndividual");
        
        if ($owlClass->length > 0 || $namedIndividual->length > 0) {
            
            //Proprietà
            $ontology = $this->extractEntities($owlClass, $ontology);
            $this->storageService->storeOntology($ontology, \__Session::get('userImport'));

            $mapping = [];
            foreach ($namedIndividual as $item) {
                $this->classTransformer->mapNamedIndividual($item, $this->xpath);
            }

            if($ontologyId){
                $this->classTransformer->getExistingIndividual($ontologyId);
            }
            $mapping = $this->classTransformer->getMappedIndividual();
            foreach ($namedIndividual as $item) {
                if(strpos($item->getAttribute('rdf:about'), $ontology->id->__get('id')) === false)
                {
                    foreach($this->namespaces as $ns)
                    {
                        if(strpos( $item->getAttribute('rdf:about'), $ns) === 0)
                        {
                            if(!is_array($ontology->derivedFrom))
                            {
                                $ontology->derivedFrom = [];
                            }
                            if(!in_array($ns, $ontology->derivedFrom))
                            {
                                //Verifico se le ontologie in riferimento nei namespaces esistono
                                $this->verifyNamespace($ns);
                                // ---- //
                                $ontology->derivedFrom[] = $ns;
                            }
                        }
                    }
                }
                $merging = null;
                $this->classTransformer->createTerminology($this->storageService, $this->readStorageService, $item, $ontology->id->__get('id'), \__Session::get('userImport'), $ontology->derivedFrom, $mapping, $this->namespaces, $merging);
            }

            //Salvo namespaces, necessari per export
            $ontology->namespaces = $this->namespaces;
            $this->storageService->storeOntology($ontology, \__Session::get('userImport'));
        }
        else
        {
            //Se l'ontologia non ha classi allora ha probabilmente solo proprietà globali.
            //Creo quindi una classe globale da utilizzare per memorizzare le proprietà.
            $ontologyElement = $this->classTransformer->addPropertiesToOntologiesLinking($this->xpath);
        }

        if(sizeof($this->topDomainOntology->items) > 0){
            $this->storageService->storeOntology($this->topDomainOntology, \__Session::get('userImport'));
        }
        return $ontology->id->__get('id');
    }


    private function parseJson($file)
    {
        $json = json_decode(file_get_contents($file));

        $this->storageService->storeOntology($json, 0);
    }

    /**
     * @param string $file
     * @return boolean
     */
    private function isValid($file)
    {
        return true;
    }

    /**
     * @param string $namespace
     */
    private function verifyNamespace($namespace)
    {
        $lastChar = substr($namespace, -1);
        if($lastChar == '#')
        {
            $namespace = substr($namespace, 0, -1);
        }
        $this->readStorageService->getOntologyByUri($namespace, false);
    }

    private function extractEntities($owlClass, $ontology)
    {
        $datatypeProperty = $this->xpath->query("owl:DatatypeProperty");
        foreach ($owlClass as $item) {
            $this->classTransformer->prepareEntities($item, $this->xpath);
        }
        foreach ($owlClass as $item) {
            $ontologyElement = $this->classTransformer->transform($item, $this->xpath, $this->namespaces, $datatypeProperty, $this->ontologyUri);
            if (!$ontologyElement) {
                continue;
            }
            if($ontologyElement->topDomain){
                unset($ontologyElement->topDomain);
                $this->topDomainOntology->addItem($ontologyElement);

                $ontologyElement = clone $ontologyElement;
                $ontologyElement->fromTopOntology = true;
                $ontologyElement->topEntity = new \stdClass();
                $ontologyElement->topEntity->value = $ontologyElement->id;
                $ontologyElement->id = $ontology->id->__get('id') . '#' . Uuid::uuid4()->toString();
                $ontologyElement->properties = [];
                $ontology->addItem($ontologyElement);

                $this->classTransformer->setEntityReference($ontologyElement->uri, $ontologyElement->id);            }
            else{
                $ontology->addItem($ontologyElement);
            }
        }
        return $ontology;
    }

    private function getTopDomainOntology()
    {
        $ontologies = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                        ->where('ontology_type','ontology');
        foreach($ontologies as $o){
            $data = json_decode($o->ontology_data);
            if($data->topDomain){
                return $this->readStorageService->getOntology($o->ontology_uri, 1);
            }
        }
    }

}
