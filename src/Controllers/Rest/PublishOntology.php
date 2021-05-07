<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;
use ICARICCU\PEB\Services\StorageService;
use ICARICCU\PEB\Models\Ontology;
use ICARICCU\PEB\Models\PropertyId;
use ICARICCU\PEB\Models\Label;

class PublishOntology extends \pinax_rest_core_CommandRest
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
        $ontology->published = true;

        //Cancellazion dei contenuti precedentemente inseriti
        $contents = $this->getIterator()
            ->where('ontology_group', $ontologyId)
            ->where('ontology_type','terminology');
        if($contents)
        {
            foreach($contents as $c)
            {
                $c->delete();
            }
        }

        $this->storageService->storeOntology($ontology, $this->userId());

        return ['http-status' => 200];  
    }
}