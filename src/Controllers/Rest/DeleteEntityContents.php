<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;
use ICARICCU\PEB\Services\StorageService;

class DeleteEntityContents extends \pinax_rest_core_CommandRest
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

        $this->storageService->deleteEntityContents($ontologyId, $entityId);
        return ['http-status' => 200];
    }
}