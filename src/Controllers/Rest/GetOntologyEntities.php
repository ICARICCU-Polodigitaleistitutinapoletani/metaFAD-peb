<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class GetOntologyEntities extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $readStorageService;
    
    public function __construct($application)
    {
        parent::__construct($application);

        $this->readStorageService = new ReadStorageService();
    }

    /**
     * @param integer $id
     * @return array
     */
    public function execute($ontologyId)
    {
        $this->check();

        $ontologyId = rawurldecode(rawurldecode($ontologyId));
        $entities = $this->readStorageService->getEntitiesForTopOntology($ontologyId);  

        if (!$entities) {
            return ['http-status' => 404];
        }

        return $entities;
    }
}
