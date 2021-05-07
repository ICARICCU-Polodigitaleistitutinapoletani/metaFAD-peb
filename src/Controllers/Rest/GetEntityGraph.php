<?php

namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class GetEntityGraph extends \pinax_rest_core_CommandRest
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
    public function execute($entityId, $search)
    {
        $this->check();

        $entityId = rawurldecode(rawurldecode($entityId));
        $entity = $this->getIterator()->load('entityByOnlyId', ['entityId' => $entityId])
            ->first();

        if (!$entity) {
            return ['http-status' => 404];
        }

        $entitiesList = [];
        $entities = $this->readStorageService->getOnlyEntitiesForOntology($entity->ontology_parentUri, '', 1, 0);
        foreach ($entities as $e) {
            $entitiesList[$e->id] = $e->name->it;
        }
        $this->getProperties($entity->ontology_parentUri, $entityId);
        if ($entity->ontology_superclass) {
            $this->getSuperclassRelations($entity);
        }

        $data = json_decode($entity->ontology_data);
        
        if ($data->copiedProperties) {
            foreach ($data->copiedProperties as $cp) {
                $copiedProperty = $this->getIterator()->where('ontology_uri', $cp)->first();
                $copiedPropertyData = json_decode($copiedProperty->ontology_data);
                if (!$copiedPropertyData->copied) {
                    $copiedPropertyData->copied = true;
                }
                $this->properties[] = $copiedPropertyData;
            }
        }

        $name = json_decode($entity->ontology_name)->it;
        $graph = 'digraph G {' . PHP_EOL . '"' . $name . '" [label="' . $name . '"];';
        
        if($data->superclass){
            $graph .= '"' . $entitiesList[$data->superclass->value] . ' "->"' . $name . '" [label="Superclasse di"];' . PHP_EOL;
        }
        
        if ($this->properties) {
            foreach ($this->properties as $p) {
                if ($p->type == 'relation') {
                    if ($p->entity) {
                        $graph .= '"' . $name . '"->"' . $entitiesList[$p->entity->id] . '" [label="' . $p->name->it . '"];' . PHP_EOL;
                    } else if ($p->codomain) {
                        if (is_string($p->codomain)) {
                            $p->codomain = [$p->codomain];
                        }

                        foreach ($p->codomain as $range) {
                            if($range){
                                $linkedEntity = $this->readStorageService->getEntityByOnlyId($range->id);
                                if ($linkedEntity) {
                                    $linkedEntityName = json_decode($linkedEntity->ontology_name)->it;
                                    $graph .= '"' . $name . '"->"' . $linkedEntityName . '" [label="' . $p->name->it . '"];' . PHP_EOL;
                                }
                            }
                        }
                    } else if (!$p->codomain && $p->domain) {
                        foreach ($p->domain as $range) {
                            $linkedEntity = $this->readStorageService->getEntityByOnlyId($range->id);
                            if ($linkedEntity) {
                                $linkedEntityName = json_decode($linkedEntity->ontology_name)->it;
                                $graph .= '"' . $name . '"->"' . $linkedEntityName . '" [label="' . $p->name->it . '"];' . PHP_EOL;
                            }
                        }
                    } else {
                        $id = explode('@', $p->id);
                        $graph .= '"' . $name . '"->"' . $entitiesList[$id[1]] . '" [label="' . $p->name->it . '"];' . PHP_EOL;
                    }
                }
            }
        }
        $graph .= '}';
        return $graph;
    }

    public function getSuperclassRelations($entity)
    {
        $this->getProperties(current(explode('#', $entity->ontology_superclass)), $entity->ontology_superclass);
        $superclass = $this->getIterator()->load('entityByOnlyId', ['entityId' => $entity->ontology_superclass])
            ->first();
        $superclassData = json_decode($superclass->ontology_data);
        if ($superclassData->copiedProperties) {
            foreach ($superclassData->copiedProperties as $cp) {
                $copiedProperty = $this->getIterator()->where('ontology_uri', $cp)->first();
                $copiedPropertyData = json_decode($copiedProperty->ontology_data);
                if (!$copiedPropertyData->copied) {
                    $copiedPropertyData->copied = true;
                }
                $this->properties[] = $copiedPropertyData;
            }
        }
        if($superclass->ontology_superclass)
        {
            $this->getSuperclassRelations($superclass);
        }
    }
}
