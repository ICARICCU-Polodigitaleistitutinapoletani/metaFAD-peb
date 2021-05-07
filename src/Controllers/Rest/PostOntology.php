<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;
use ICARICCU\PEB\Services\StorageService;
use ICARICCU\PEB\Models\Ontology;
use ICARICCU\PEB\Models\PropertyId;
use ICARICCU\PEB\Models\Label;

class PostOntology extends \pinax_rest_core_CommandRest
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
    public function execute($ontologyId)
    {
        $this->check();

        try {
            $ontologyId = rawurldecode(rawurldecode($ontologyId));
            $ontology = $this->readStorageService->getOntology($ontologyId, $this->userId());  
        } catch (\Exception $e) {
            return ['http-status' => 404];
        }

        $postBody = json_decode(\__Request::getBody());
        
        $postBody->uri = \__Config::get('ontology.uri.common') . $postBody->acronym . '/';
        //Verifica esistenza ontologia
        $ar = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                ->where('ontology_real_uri', $postBody->uri)
                ->first();
        if($ar && $ar->ontology_uri != $ontologyId){
            return ['message' => 'Ontologia '. $postBody->uri . ' già esistente.'];
        }

        $this->storageService->storeOntology($postBody, $this->userId());

        $ontology = $this->readStorageService->getOntology($ontologyId, $this->userId());  
        return $this->readStorageService->compileOntologyDetail($ontology);  
    }
}