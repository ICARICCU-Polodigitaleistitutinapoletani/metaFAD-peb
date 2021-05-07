<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class GetEntityTerminologies extends \pinax_rest_core_CommandRest
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
    public function execute($ontologyId, $entityId)
    {
        $this->check();

        $result = new \stdClass();

        $search = \__Request::get('search', '');
        $page = \__Request::get('page', 1);
        $limit = \__Request::get('limit', 10);

        $entityId = rawurldecode(rawurldecode($entityId));
        $ontologyId = rawurldecode(rawurldecode($ontologyId));

        $entity = $this->getIterator()->load('entityByOnlyId',['entityId' => $entityId])
                    ->first();
        if (!$entity) {
            return ['http-status' => 404];
        }

        //Lettura terminologie
        $tot = $this->getIterator()
                ->load('terminologyBySuperclass', [
                    'ontologyId' => $ontologyId,
                    'superclass' => $entityId,
                    'search' => $search,
                    'page' => $page,
                    'limit' => 0
                ])->count();
        if($tot != 0 && $tot <= ($page-1) * $limit)
        {
            $page = $tot / $limit;
            $page = ceil($page);
        }

        $terminologies = [];
        $it = $this->getIterator()
            ->load('terminologyBySuperclass', ['ontologyId' => $ontologyId, 
                                                'superclass' => $entityId,
                                                'search' => $search,
                                                'page' => $page, 
                                                'limit' => $limit]);
        foreach($it as $ar)
        {
            $data = json_decode($ar->ontology_data);
            $d = new \DateTime(str_replace('/','-',$ar->ontology_modificationdate));
            if($data){
                $data->lastModified = $d->format('d/m/Y H:i:s');
                $terminologies[] = $data;    
            }
        }
    
        $result->records = $terminologies;
        $result->searchApplied = new \stdClass();
        $result->searchApplied->search = $search;
        $result->searchApplied->page = $page;
        $result->searchApplied->limit = $limit;
        $result->searchApplied->tot = $tot;

        return $result;
    }    
}
