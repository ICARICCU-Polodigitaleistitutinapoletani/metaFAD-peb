<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class GetOntologyTerminologiesSearch extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $readStorageService;
    
    public function __construct($application)
    {
        parent::__construct($application);

        $this->readStorageService = new ReadStorageService();
    }

    public function execute($ontologyId)
    {
        $this->check();

        $result = new \stdClass();
        $search = \__Request::get('search', '');
        $page = \__Request::get('page', 1);
        $limit = \__Request::get('limit', 10);

        $ontologyId = rawurldecode(rawurldecode($ontologyId));
        $instances = $this->readStorageService->getOnlyInstancesForOntology($ontologyId, $search, $page, $limit);

        if (!$instances) {
            return ['http-status' => 404];
        }

        $result->records = $instances;
        $result->searchApplied = new \stdClass();
        $result->searchApplied->search = $search;
        $result->searchApplied->page = $page;
        $result->searchApplied->limit = $limit;
        $result->searchApplied->tot = sizeof($this->readStorageService->getOnlyInstancesForOntology($ontologyId, $search, 1, 0));

        return $result;
    }
}
