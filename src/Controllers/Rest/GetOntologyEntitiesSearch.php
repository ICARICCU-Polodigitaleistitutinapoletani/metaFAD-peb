<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;
use ICARICCU\PEB\Models\Entity;

class GetOntologyEntitiesSearch extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $readStorageService;
    private $properties = [];
    private $resolveEntities = [];
    
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
        ini_set('memory_limit', '8096M');
        $this->check();
        $entities = [];
        $entityDerivedOntoId = [];
        $result = new \stdClass();
        $search = \__Request::get('search', '');
        $page = \__Request::get('page',1);
        $limit = \__Request::get('limit',10);
        $fromTop = (\__Request::get('fromTop') === false) ? false : true; 
        $limit = ($limit > 0) ? $limit : 10;
        $ontologyId = rawurldecode(rawurldecode($ontologyId));
        
        $entities = $this->readStorageService->getOnlyEntitiesForOntology($ontologyId, $search, 1, 0, $fromTop);
        
        $tot = sizeof($entities);

        $entitiesToShow = [];
        for($i = ($page - 1) * $limit;$i < $page * $limit;$i++)
        {
            if(!$entities[$i])
            {
                break;
            }
            $entitiesToShow[] = $entities[$i];
        }
        $entities = $entitiesToShow;

        $entitiesKeys = [];
        //Lettura proprietà per entity
        foreach($entities as $k => $entity)
        {
            $entitiesKeys[$entity->id] = $k;

            $relations = 0;
            $properties = 0;

            if($entity->derivedFrom)
            {
                $oId = $entityDerivedOntoId[$entity->id];
            }
            else
            {
                $oId = $ontologyId;
            }

            $this->properties = [];
            $this->resolveEntities = [];

            $this->getProperties(($entity->ontologyId)?:$ontologyId, $entity->id);
            if($entity->superclass)
            {
                $this->getSuperclassesProperties($entity);
            }
            if($entity->topEntity)
            {
                $this->getSuperclassesProperties($entity, true);
            }
            $countCopiedProperties = 0;
            if($entity->copiedProperties)
            {
                $countCopiedProperties = sizeof($entity->copiedProperties);
            }

            $propertiesValues = [];
            foreach($this->properties as $p)
            {
                if(!in_array($p->uri,$propertiesValues))
                {
                    if($p->type == 'relation')
                    {
                        $relations++;
                    }
                    else if($p->type == 'property')
                    {
                        $properties++;
                    }
                    $propertiesValues[] = $p->uri;
                }
            }            

            $entity->relations = $relations + $countCopiedProperties;
            $entity->properties = $properties;
            $entity->terminologies = 0;
        }

        //Lettura terminologie
        $it = $this->getIterator()
            ->load('allTerminologyByOntologyId', ['ontologyId' => $ontologyId]);
        foreach($it as $ar)
        {
            $data = json_decode($ar->ontology_data);
            $superclass = $data->superclass->value;
            $key = $entitiesKeys[$superclass];
            if ($entities[$key]) {
                $entities[$key]->terminologies++;
            }
        }
 
        if(\__Request::get('topEntities'))
        {
            $ontologies = $this->readStorageService->getOntologies($this->userId());
            foreach($ontologies as $o)
            {
                if($o->topDomain == true)
                {
                    $topDomain = $o->id;
                    break;
                }
            }
            $entitiesFromTop = $this->readStorageService->getOnlyEntitiesForOntology($topDomain, $search, 1, 0);
            foreach($entitiesFromTop as $eft)
            {
                $entities[] = $eft;
            }
            foreach($entities as $k => $e)
            {
                if($e->fromTopOntology)
                {
                    unset($entities[$k]);
                }
            }
        }

        $result->records = $this->sortEntities($entities);
        $result->searchApplied = new \stdClass();
        $result->searchApplied->search = $search;
        $result->searchApplied->page = $page;
        $result->searchApplied->limit = $limit;
        $result->searchApplied->tot = $tot;

        return $result;
    }

    private function sortEntities($entities)
    {
        usort($entities, function($a, $b)
        {
            return strcasecmp($a->name->it, $b->name->it);
        });
        return $entities;
    }
}
