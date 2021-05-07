<?php
namespace ICARICCU\PEB\Controllers\Rest;

class ReindexSolr extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $url;
    private $solrService;
    
    public function __construct($application)
    {
        $this->solrService = \__ObjectFactory::createObject('ICARICCU\PEB\Services\SolrService');

        parent::__construct($application);
    }

    /**
     * @param integer $id
     * @return array
     */
    public function execute($ontologyId)
    {
        $peb = \__Request::get('peb');
        $metaindex = ($peb) ? false : true;
        $this->solrService->deleteAllDataOfOntologyFromSolr($ontologyId,$metaindex);

        $entitiesList = [];
        $entities = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                ->where('ontology_group',$ontologyId)
                ->where('ontology_type','entity');
        foreach($entities as $e){
            $entitiesList[$e->ontology_uri] = json_decode($e->ontology_name)->it;
        }
        $this->solrService->setEntitiesList($entitiesList);

        $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                ->where('ontology_group',$ontologyId)
                ->where('ontology_type','terminology');

        if(!$peb){
            foreach($it as $ar){
                $this->solrService->saveOnSolr($ar, 100);
            }
            $this->solrService->commitRemaining(true);
        }
        else{
            foreach($it as $ar){
                $this->solrService->saveOnSolr($ar, 100, false);
            }
            $this->solrService->commitRemaining(false);
        }

        return ['http-status' => 200];
        
    }

}
