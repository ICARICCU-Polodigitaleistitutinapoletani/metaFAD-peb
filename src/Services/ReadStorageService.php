<?php
namespace ICARICCU\PEB\Services;

use ICARICCU\PEB\Models\OntologyManagerTypeEnum;
use ICARICCU\PEB\Models\Ontology;
use ICARICCU\PEB\Models\Entity;
use ICARICCU\PEB\Exception;
use Ramsey\Uuid\Uuid;

class ReadStorageService
{
    private $entityProperties = [];
    /**
     * @param integer $userId
     * @return ICARICCU\PEB\Models\Ontology[]
     */
    public function getOntologies($userId)
    {
        $it = $this->getIterator()
                ->load('ontologies', ['userId' => $userId]);

        $count = 0;
        $results = [];
        foreach($it as $ar) {
            $ontology = Ontology::fromJson($ar->ontology_data);
            $ontology->entities = $this->countEntities($ar->ontology_uri);
            $ontology->terminology = $ar->terminology;
            $ontology->contents = $ar->contents;
            $d = new \DateTime(str_replace('/','-',$ar->ontology_modificationdate));
            $ontology->lastModified = $d->format('d/m/Y H:i:s');
            $results[] = $ontology;
            $count++;
        }
        
        return $results;
    }

    /**
     * @return array
     */
    public function getOntologiesSimple()
    {
        $it = $this->getIterator()
            ->load('ontologies', ['userId' => 1]);

        $results = [];
        foreach ($it as $ar) {
            $ontology = Ontology::fromJson($ar->ontology_data);
            $ontoData = new \stdClass();
            
            $ontoData->id = urlencode(urlencode($ontology->id->__get('id')));
            $ontoData->label = $ontology->name->it;
            
            $results[] = $ontoData;
        }

        return $results;
    }

    /**
     * @param integer $userId
     * @return integer[]
     */
    public function getOntologiesId($userId)
    {
        $it = $this->getIterator()
                ->load('ontologies', ['userId' => $userId]);

        $results = [];
        foreach($it as $ar) {
            $results[] = $ar->ontology_uri;
        }

        return $results;
    }

    /**
     * @param string $language
     * @return array
     */
    public function relationDefnitions($language)
    {
        return $this->readDefinitions($language, OntologyManagerTypeEnum::DEF_RELATION);
    }

    /**
     * @param string $language
     * @return array
     */
    public function fieldsDefnitions($language)
    {
        return $this->readDefinitions($language, OntologyManagerTypeEnum::DEF_FIELD);
    }

   /**
     * @param string $language
     * @return array
     */
    public function terminologiesDefnitions($language)
    {
        return $this->readDefinitions($language, OntologyManagerTypeEnum::DEF_TERMINOLOGY);
    }

    /**
     * @param integer $userId
     * @return ICARICCU\PEB\Models\Ontology[]
     */
    public function getOntology($ontologyId, $userId)
    {
        $ar = $this->getIterator()
                ->load('ontologyById', ['ontologyId' => $ontologyId, 'userId' => $userId])
                ->first();
        if (!$ar) {
            throw Exception::ontologyNotFound($ontologyId);
        }
        
        return Ontology::fromJson($ar->ontology_data);
    }

    /**
     * @param integer $userId
     * @return ICARICCU\PEB\Models\Ontology[]
     */
    public function getOntologyByIdOnly($ontologyId)
    {
        $ar = $this->getIterator()
            ->load('ontologyByIdOnly', ['ontologyId' => $ontologyId, 'userId'])
            ->first();
        if (!$ar) {
            throw Exception::ontologyNotFound($ontologyId);
        }

        return Ontology::fromJson($ar->ontology_data);
    }

    /**
     * @param integer $ontologyUri
     * @return ICARICCU\PEB\Models\Ontology[]
     */
    public function getOntologyByUri($ontologyUri, $throwError = true)
    {
        $ar = $this->getIterator()
            ->load('ontologyByUri', ['ontologyUri' => $ontologyUri, 'userId'])
            ->first();
        if (!$ar && $throwError) {
            throw Exception::ontologyNotFound($ontologyUri);
        }
        if(!$ar && !$throwError)
        {
            return null;
        }

        return Ontology::fromJson($ar->ontology_data);
    }

    /**
     * @param ICARICCU\PEB\Models\Ontology $ontology
     * @return void
     */
    public function compileOntologyDetail($ontology)
    {
        $imported = $ontology->imported;
        $derivedFrom = $ontology->derivedFrom;

        //Campo URI non editabile se l'ontologia è importata
        $showEditingUri = $this->isUuid((is_string($ontology->id)?:$ontology->id->__get('id')));

        $entities = [];
        $it = $this->getIterator()
            ->load('entitiesForOntology', ['ontologyId' => (string)$ontology->id, 'imported' => $imported]);
        foreach($it as $ar) {
            $entity = Entity::fromJson($ar->ontology_data);
            if(!$entity->uri)
            {
                $entity->uri = $ontology->uri . '#{name}';
            }
            $newId = (string)$entity->id;
            if (!$newId) continue;
            $entity->hidden = in_array($entity->id, $imported);
            $entities[$entity->id] = $entity;
        }

        if($derivedFrom)
        {
            foreach($derivedFrom as $dfId)
            {
                $lastChar = substr($dfId, -1);
                if ($lastChar == '#') {
                    $dfId = substr($dfId, 0, -1);
                }
                $it = $this->getIterator()
                    ->load('entitiesForOntology', ['ontologyId' => (string)$dfId, 'imported' => $imported]);
                foreach ($it as $ar) {
                    $entity = Entity::fromJson($ar->ontology_data);
                    $newId = (string)$entity->id;
                    if (!$newId) continue;
                    $entity->hidden = in_array($entity->id, $imported);
                    $entity->derivedFrom = true;
                    $entities[$entity->id] = $entity;
                }
            }
        }

        if ($entities) {
            $it = $this->getIterator()
                    ->load('propertiesForEntity', ['ontologyId' => (string)$ontology->id, 'entitiesId' => array_keys($entities)]);
            foreach($it as $ar) {
                $data = json_decode($ar->ontology_data);
                $newId = (string)$data->id;
                if (!$newId) continue;
                $entities[$ar->ontology_parentUri]->addProperty($data);
                if ($data->type == 'superclass') {
                    $entities[$ar->ontology_parentUri]->superclassExport = $data->value;
                }
            }        
        }

        if ($derivedFrom) {
            foreach ($derivedFrom as $dfId) 
            {
                $it = $this->getIterator()
                    ->load('propertiesForEntity', ['ontologyId' => (string)$dfId, 'entitiesId' => array_keys($entities)]);
                foreach ($it as $ar) {
                    $data = json_decode($ar->ontology_data);
                    $newId = (string)$data->id;
                    if (!$newId) continue;
                    $entities[$ar->ontology_parentUri]->addProperty($data);
                }        
            }
        }
 
        $ontology->showEditingUri = $showEditingUri;
        $ontology->items = array_values($entities);
        return $ontology;
    }

    /**
     * @param ICARICCU\PEB\Models\Ontology $ontology
     * @return void
     */
    public function compileOntologyDetailForDuplicate($ontology)
    {
        $imported = $ontology->imported;

        $entityIdMap = [];

        $entities = [];
        $it = $this->getIterator()
            ->load('entitiesForOntology', ['ontologyId' => (string)$ontology->id, 'imported' => $imported]);

        foreach ($it as $ar) {
            $entity = Entity::fromJson($ar->ontology_data);
            $uuid = Uuid::uuid4();
            $entityIdMap[$entity->id] = $uuid->toString();
        }
        
        foreach ($it as $ar) {
            $entity = Entity::fromJson($ar->ontology_data);
            $entityId = $entity->id;
            
            $entity->id = $entityIdMap[$entityId];

            $entities[$entityId] = $entity;

            if($entity->superclass)
            {
                $entity->superclass->value = $entityIdMap[$entity->superclass->value];
            }
        }

        if ($entities) {
            $it = $this->getIterator()
                ->load('propertiesForEntity', ['ontologyId' => (string)$ontology->id, 'entitiesId' => array_keys($entities)]);
            foreach ($it as $ar) {
                $data = json_decode($ar->ontology_data);
                unset($data->id);
                $entities[$ar->ontology_parentUri]->addProperty($data);
            }
        }

        $ontology->items = array_values($entities);
        return $ontology;
    }

    /**
     * @param string $ontologyId
     * @return ICARICCU\PEB\Models\Entity
     */
    public function getEntitiesForTopOntology($ontologyId)
    {
        $entities = [];
        $it = $this->getIterator()
            ->load('entitiesForOntology', ['ontologyId' => $ontologyId, 'imported' => []]);
        foreach($it as $ar) {
            $entity = Entity::fromJson($ar->ontology_data);
            $entities[] = $entity;
        }

        return $entities;
    }

    /**
     * @param string $ontologyId
     * @return array $entities
     */
    public function getOnlyEntitiesForOntology($ontologyId, $search = '', $page = 1, $limit = 10, $fromTop = true)
    {
        if($page == 0)
        {
            $page = 1;
        }
        $entities = [];
        $it = $this->getIterator()
            ->load('onlyEntitiesForOntology', ['ontologyId' => $ontologyId, 
                                                'search' => $search, 
                                                'page' => $page, 
                                                'limit' => $limit,
                                                'fromTop' => $fromTop]);
        foreach ($it as $ar) {
            $entity = Entity::fromJson($ar->ontology_data);
            $entities[] = $entity;
        }

        return $entities;
    }

    /**
     * @param string $ontologyId
     * @return ICARICCU\PEB\Models\Entity
     */
    public function getOnlyInstancesForOntology($ontologyId, $search = '', $page = 1, $limit = 10)
    {
        $entities = [];
        $it = $this->getIterator()
            ->load('onlyInstancesForOntology', ['ontologyId' => $ontologyId, 
                                                'search' => $search,
                                                'page' => $page,
                                                'limit' => $limit]);
        foreach ($it as $ar) {
            $entity = Entity::fromJson($ar->ontology_data, false);
            $entities[] = $entity;
        }

        return $entities;
    }

    /**
     * @param string $ontologyId
     * @param string $entityId
     * @param integer $userId
     * @return ICARICCU\PEB\Models\Entity
     */
    public function getEntity($ontologyId, $entityId, $userId)
    {
        $ar = $this->getIterator()
                ->load('entityById', ['ontologyId' => $ontologyId, 'entityId' => $entityId, 'userId' => $userId])
                ->first();
        if (!$ar) {
            throw Exception::entityNotFound($entityId);
        }
        return Entity::fromJson($ar->ontology_data);;
    }

    /**
     * @param string $entityId
     * @return ICARICCU\PEB\Models\Entity
     */
    public function getEntityByOnlyId($entityId)
    {
        $ar = $this->getIterator()
            ->load('entityByOnlyId', ['entityId' => $entityId])
            ->first();
        return $ar;
    }

    /**
     * @param string $entityId
     * @return ICARICCU\PEB\Models\Entity
     */
    public function getEntityByUri($entityUri)
    {
        $ar = $this->getIterator()
            ->load('entityByUri', ['entityUri' => $entityUri])
            ->first();
        return $ar;
    }

    /**
     * @param string $entityId
     * @return ICARICCU\PEB\Models\Entity
     */
    public function getInstancesByUri($instanceUri)
    {
        $ar = $this->getIterator()
            ->load('instanceByUri', ['instanceUri' => $instanceUri])
            ->first();
        return $ar;
    }

    /**
     * @param string $terminologyId
     * @return ICARICCU\PEB\Models\Entity
     */
    public function terminologyByIdOnly($terminologyId)
    {
        $ar = $this->getIterator()
            ->load('terminologyByIdOnly', ['terminologyId' => $terminologyId])
            ->first();
        return $ar;
    }

    /**
     * @param string $ontologyId
     * @param string $itemId
     * @param integer $userId
     * @param string $type
     */
    public function getItem($ontologyId, $itemId, $userId, $type)
    {
        if($type == 'entity')
        {
            $ar = $this->getIterator()
                ->load('entityById', ['ontologyId' => $ontologyId, 'entityId' => $itemId, 'userId' => $userId])
                ->first();
        }
        else if($type == 'terminology')
        {
            $ar = $this->getIterator()
                ->load('terminologyById', ['ontologyId' => $ontologyId, 'terminologyId' => $itemId, 'userId' => $userId])
                ->first();
        }

        $ontologyData = json_decode($ar->ontology_data);

        if ($ar) {
            $it = $this->getIterator()
                ->load('propertiesForEntity', ['ontologyId' => (string)$ontologyId, 'entitiesId' => array($itemId)]);
            foreach ($it as $p) {
                $data = json_decode($p->ontology_data);
                $newId = (string)$data->id;
                if (!$newId) continue;
                array_push($ontologyData->properties,$data);
            }
        }

        if (!$ar) {
            throw Exception::entityNotFound($itemId);
        }
        return Entity::fromJson(json_encode($ontologyData));
    }

    /**
     * @param string $ontologyId
     * @param string $terminologyId
     * @param integer $userId
     * @return ICARICCU\PEB\Models\Terminology
     */
    public function getTerminology($ontologyId, $terminologyId, $userId)
    {
        $ar = $this->getIterator()
            ->load('terminologyById', ['ontologyId' => $ontologyId, 'terminologyId' => $terminologyId, 'userId' => $userId])
            ->first();
        if (!$ar) {
            throw Exception::entityNotFound($terminologyId);
        }
        return Entity::fromJson($ar->ontology_data);;
    }

    public function filterpeb($values, $onlypeb=true)
    {
        $values = array_filter($values, function($item) use ($onlypeb) {
            $tempItem = (array)$item;
            $pos = strpos($tempItem['id'], '/peb');
            return $onlypeb ? $pos!==false : $pos===false;
        });
        return array_values($values);
    }

    /**
     * @param string $language
     * @param string $type
     * @return array
     */
    private function readDefinitions($language, $type)
    {
        $ontologies = array_reduce($this->getOntologies(0), function($carry, $item) use ($language) {
            $id = (string)$item->id;

            $tempOntology = [
                'id' => $id,
                'type' => $item->name->{$language},
                'values' => []
            ];
            $carry[$id] = $tempOntology;
            return $carry;
        }, []);

        $it = $this->getIterator()
                ->load('ontologyTypeDefinition', 
                        ['ontologiesId' => array_keys($ontologies), 'type' => $type]);

        foreach($it as $ar) {
            $data = json_decode($ar->ontology_data);

            if ($type == 'def_relation') 
            {
                $relation = $this->getIterator()
                            ->where('ontology_uri', $data->id.'@%','ILIKE')
                            ->first();
                $relationRealId = $relation->ontology_uri;
            }
            else
            {
                $relationRealId = null;
            }

            $ontologies[$ar->ontology_group]['values'][] = [
                'id' => ($relationRealId)?:$data->id,
                'type' => $data->name->{$language},
            ];
        }

        $filters = array_filter($ontologies, function($item){
            return count($item['values']);
        });

        return array_values($filters);
    }

    public function getPropertiesForEntities($ontologyId, $itemId)
    {
        if(!$this->entityProperties[$itemId]){
            $gep = \__ObjectFactory::createObject('ICARICCU\PEB\Controllers\Rest\GetEntityProperties', \pinax_ObjectValues::get('org.pinax', 'application'));
            $entity = $gep->execute($itemId, '');
            $this->entityProperties[$itemId] = $entity->properties;
        }
        return $this->entityProperties[$itemId];
    }

    /**
     * @return ICARICCU\PEB\Models\OntologyManager
     */
    private function getIterator()
    {
        return \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager');
    }

    function isUuid($id)
    {
        if (!is_string($id) || (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/', $id) !== 1)) {
            return false;
        }
        return true;
    }

    function countEntities($ontologyId)
    {
        $entities = $this->getOnlyEntitiesForOntology($ontologyId, '', 1, 0);

        $ontology = $this->getOntologyByIdOnly($ontologyId);
        if ($ontology->derivedFrom) {
            $imported = $ontology->imported;
            foreach ($ontology->derivedFrom as $dfId) {
                $lastChar = substr($dfId, -1);
                if ($lastChar == '#') {
                    $dfId = substr($dfId, 0, -1);
                }
                $it = $this->getIterator()
                    ->load('entitiesForOntology', ['ontologyId' => (string)$dfId, 'imported' => $imported]);
                foreach ($it as $ar) {
                    $entity = Entity::fromJson($ar->ontology_data);
                    $entity->ontologyId = $ar->ontology_parentUri;
                    $newId = (string)$entity->id;
                    if (!$newId) continue;
                    $entity->hidden = in_array($entity->id, $imported);
                    $entity->derivedFrom = true;
                    if ($entity->type == 'entity') {
                        $entities[] = $entity;
                    }
                }
            }
        }
        return sizeof($entities);
    }
}
