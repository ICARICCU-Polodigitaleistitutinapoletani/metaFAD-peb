<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;
use ICARICCU\PEB\Services\StorageService;

class DeletingInfo extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $readStorageService;
    private $storageService;

    public function __construct($application)
    {
        parent::__construct($application);

        $this->readStorageService = new ReadStorageService();
        $this->storageService = new StorageService();
    }

    /**
     * @param integer $id
     * @return array
     */
    public function execute($ontologyId, $entityId)
    {
        $this->check();

        try {
            $ontologyId = rawurldecode(rawurldecode($ontologyId));
            $ontology = $this->readStorageService->getOntology($ontologyId, $this->userId());
        } catch (\Exception $e) {
            return ['http-status' => 500];
        }

        try {
            $entityId = rawurldecode(rawurldecode($entityId));
            $entity = $this->readStorageService->getEntity($ontologyId, $entityId, $this->userId()); 
        } catch (\Exception $e) {
            return ['http-status' => 500];
        }

        $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
            ->load('onlyEntitiesForOntology', ['ontologyId' => $ontologyId, 
                                                'search' => '', 
                                                'page' => 0, 
                                                'limit' => 0,
                                                'fromTop' => true]);
        $htmlSubclasses = '';

        foreach($it as $e)
        {
            if($e->ontology_superclass == $entityId){
                $htmlSubclasses .= '<li>' . $e->ontology_real_uri . '</li>';
            }
        }

        $propertiesForOntology = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
            ->load('propertiesForOntology', ['ontologyId' => $ontologyId]);
        $htmlPropertiesDeleting = '';

        foreach($propertiesForOntology as $p){
            $propData = json_decode($p->ontology_data);
            if($propData->codomain){
                foreach($propData->codomain as $c){
                    if($c->id == $entityId){
                        $htmlPropertiesDeleting .= '<li>' . $propData->uri . '</li>';
                    }
                }
            }
        }

        if($htmlSubclasses){
            $htmlSubclasses = 'Le seguenti sono sottoclassi di quella che si sta cancellando:<br/><ul>' . $htmlSubclasses . '</ul><br/>';
        }
        if($htmlPropertiesDeleting){
            $htmlPropertiesDeleting = 'Le seguenti relazioni non saranno più coerenti:<br/><ul>' . $htmlPropertiesDeleting . '</ul>';
        }
        $html = <<<EOD
        La rimozione dell'entità comporta la rimozione di tutte le sue istanze.
        <br/>
        $htmlSubclasses
        $htmlPropertiesDeleting
        Sei sicuro di voler proseguire?
EOD;
        return $html;
    }
}