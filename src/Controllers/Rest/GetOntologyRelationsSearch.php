<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class GetOntologyRelationsSearch extends \pinax_rest_core_CommandRest
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
        $ontologyId = urldecode(urldecode($ontologyId));
        $search = \__Request::get('search')?:'';
        $page = \__Request::get('page')?:1;
        $limit = \__Request::get('limit')?:10;

        $result = [];

        $ontology = $this->readStorageService->getOntology($ontologyId, $this->userId());  
        if($ontology->derivedFrom)
        {
            foreach($ontology->derivedFrom as $d)
            {
                $properties = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                    ->load('propertiesForOntology', ['ontologyId' => $d]);
                foreach($properties as $p)
                {
                    $data = json_decode($p->ontology_data);  
                    $name = $data->name->it;
                    
                    if($search != '')
                    {
                        if(strpos(strtolower($name), strtolower($search)) === false)
                        {
                            continue;
                        }
                    } 

                    if($data->type == 'relation')
                    {
                        if($data->symmetric)
                        {
                            $data->disableReverse = true;
                        }
                        $result[] = $data;
                    }
                }
            }
        }

        $properties = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
            ->load('propertiesForOntology', ['ontologyId' => $ontologyId]);
        
        foreach($properties as $p)
        {
            $data = json_decode($p->ontology_data);  
            $name = $data->name->it;
            
            if($search != '')
            {
                if(strpos(strtolower($name), strtolower($search)) === false)
                {
                    continue;
                }
            } 

            if($data->type == 'relation')
            {
                if($data->symmetric)
                {
                    $data->disableReverse = true;
                }
                if(!$data->domain && !$data->codomain){
                    $data->canDelete = true;
                }
                else{
                    $data->canDelete = false;
                }
                $result[] = $data;
            }
        }

        $filteredResult = [];
        for($i = (($page -1) * $limit); $i < $page * $limit; $i++)
        {
            if($i >= sizeof($result))
            {
                break;
            }
            $filteredResult[] = $result[$i];
        }

        $r = new \stdClass();
        $r->records = $filteredResult;
        $r->searchApplied = new \stdClass();
        $r->searchApplied->search = $search;
        $r->searchApplied->page = $page;
        $r->searchApplied->limit = $limit;
        $r->searchApplied->tot = sizeof($result);

        return $r;
    }
}
