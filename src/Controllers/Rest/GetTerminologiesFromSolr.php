<?php
namespace ICARICCU\PEB\Controllers\Rest;

class GetTerminologiesFromSolr extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $url;
    private $solrService;
    
    public function __construct($application)
    {
        $this->url = \__Config::get('peb.solr.host') . 'solr/metaindice/';
        $this->solrService = \__ObjectFactory::createObject('ICARICCU\PEB\Services\SolrService');

        parent::__construct($application);
    }

    /**
     * @param integer $id
     * @return array
     */
    public function execute($ontologyId, $search = '*', $facets = [], $page = 1, $limit = 10)
    {
        if($search == ''){
            $search = '*';
            $originalSearch = '';
        }

        $results = $this->solrService->getFromSolr($ontologyId, $search, $facets, $page, $limit);

        $results['searchApplied'] = new \stdClass();
        $results['searchApplied']->search = ($originalSearch)?:$search;
        $results['searchApplied']->page = $page;
        $results['searchApplied']->limit = $limit;
        $results['searchApplied']->facets = (object)$facets;
        $results['searchApplied']->tot = $results['tot'];
        unset($results['tot']);

        return $results;
    }

}
