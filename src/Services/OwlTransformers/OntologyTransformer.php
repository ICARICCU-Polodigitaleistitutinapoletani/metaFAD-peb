<?php
namespace ICARICCU\PEB\Services\OwlTransformers;

use ICARICCU\PEB\Models\Ontology;
use ICARICCU\PEB\Models\Label;
use ICARICCU\PEB\Models\PropertyId;
use Ramsey\Uuid\Uuid;

class OntologyTransformer implements Transformer
{
    public function transform($node, $xpath, $namespaces, $properties = null, $ontologyUri = null)
    {
        $readStorageService = \__ObjectFactory::createObject('ICARICCU\PEB\Services\ReadStorageService');

        $ontologyNode = $xpath->query("owl:Ontology")->item(0);
        if(array_key_exists('dc', $namespaces))
        {
            if($xpath->query("dc:title", $ontologyNode)->length > 0)
            {
                $ontologyName = $this->label($xpath->query("dc:title", $ontologyNode));
            }
        }
        
        if(!$ontologyName)
        {
            $ontologyName = end(explode('/',$ontologyNode->getAttribute('rdf:about')));
            if($ontologyName)
            {
                $ontologyName = $this->formatName($ontologyName);   
            }
            else
            {
                $ontologyName = $this->formatName($ontologyNode->getAttribute('rdf:about'));
            }
        }
        
        if(!$ontologyName)
        {
            $ontologyName = $this->formatName('Nuova ontologia');
        }

        $ontology = $readStorageService->getOntologyByUri($ontologyNode->getAttribute('rdf:about'), false);
        if(!$ontology)
        {
            $ontology = new Ontology(
                new PropertyId(Uuid::uuid4()->toString()),
                    $ontologyName
            );
        }

        //Se l'ontologia ne importa un'altra posso sfruttare il campo derivedFrom ?
        $importExtra = $xpath->query("owl:imports", $ontologyNode)->item(0);
        if($importExtra)
        {
            $extraOntologyUri = str_replace('#','',$importExtra->getAttribute('rdf:resource'));
            try {
                $extraOntology = $readStorageService->getOntology($extraOntologyUri, 1);
            } catch (\Exception $e) {
                die($e);
            }
            $ontology->derivedFrom = [$extraOntologyUri];
        }
                                
        $ontology->ontologySite = $ontologyNode->getAttribute('rdf:about');
        
        $ontologyNodeItem = $xpath->query("owl:versionIRI", $ontologyNode)->item(0);
        $ontology->ontologyUrl = ($ontologyNodeItem) ? (string)$ontologyNodeItem->getAttribute('rdf:resource') : '';

        //Estrazione descrizione 
        if($xpath->query("rdfs:comment", $ontologyNode)->length > 0)
        {
            $ontology->description = $this->getValuesFromNode($xpath->query("rdfs:comment", $ontologyNode));
        }

        //Acronimo
        $ontology->acronym = end(explode('/',substr($ontologyNode->getAttribute('rdf:about'),0,-1)));
        $ontology->reference = $ontology->acronym;
        $ontology->uri = $ontologyNode->getAttribute('rdf:about');

        return $ontology;
    }

    /**
     * @param array $nodes
     * @return ICARICCU\PEB\Models\Label
     */
    private function label($nodes)
    {
        $label = new Label();

        foreach($nodes as $node) {
            $label->add($node->getAttribute('xml:lang'), ucfirst($node->nodeValue));
        }
        return $label;
    }

    /**
     * @param array $nodes
     * @return string
     */
    private function getValuesFromNode($nodes)
    {
        $value = '';
        foreach($nodes as $node) {
            $value .= ucfirst($node->nodeValue);
        }
        return $value;
    }

    private function formatName($name)
    {
        $n = new \StdClass();
        $n->it = ucfirst($name);
        return $n;
    }

}
