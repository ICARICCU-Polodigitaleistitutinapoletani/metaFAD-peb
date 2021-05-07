<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;
use ICARICCU\PEB\Services\StorageService;

class DeleteTerminology extends \pinax_rest_core_CommandRest
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
    public function execute($ontologyId, $terminologyId)
    {
        $this->check();

        try {
            $ontologyId = rawurldecode(rawurldecode($ontologyId));
            $ontology = $this->readStorageService->getOntology($ontologyId, $this->userId());
        } catch (\Exception $e) {
            return ['http-status' => 404];
        }

        try {
            $terminologyId = rawurldecode(rawurldecode($terminologyId));
            $terminology = $this->readStorageService->getTerminology($ontologyId, $terminologyId, $this->userId()); 
        } catch (\Exception $e) {
            return ['http-status' => 404];
        }

        $this->storageService->deleteTerminology($terminologyId);
        return ['http-status' => 200];
    }
}