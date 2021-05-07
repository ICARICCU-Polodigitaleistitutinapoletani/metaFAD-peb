<?php
namespace ICARICCU\PEB\Services;

use ICARICCU\PEB\Models\OntologyManagerTypeEnum;
use ICARICCU\PEB\Models\PropertyId;
use ICARICCU\PEB\Models\Label;
use Ramsey\Uuid\Uuid;

class StorageService
{
    private $solrService;
    private $ar;

    public function __construct()
    {
        $this->ar = \__ObjectFactory::createModel('ICARICCU\PEB\Models\OntologyManager');
        $this->solrService = \__ObjectFactory::createObject('ICARICCU\PEB\Services\SolrService');
    
    }

    /**
     * @param ICARICCU\PEB\Models\Ontology|StdClass $ontology
     * @param integer $userId
     * @return void
     */
    public function storeOntology($ontology, $userId)
    {
        $items = $ontology->items;
        $ontology->items = [];

        $ontologyId = (string)$ontology->id;
        $this->save($ontology, OntologyManagerTypeEnum::ONTOLOGY, '', $ontologyId, $userId);

        foreach ($items as $item) {
            $id = (string)$item->id;
            if (!$id) {
                $item->id = new PropertyId();
            }
            if ($item->type==OntologyManagerTypeEnum::ENTITY) {
                $this->storeEntity($item, $ontologyId, $userId);
                continue;
            }
            $this->save($item, $item->type, $ontologyId, $ontologyId, $userId);
        }
    }

    /**
     * @param ICARICCU\PEB\Models\Entity|StdClass  $item
     * @param string $ontologyId
     * @param integer $userId
     * @return void
     */
    public function storeItem($item, $ontologyId, $userId, $top = true, $returnProperties = false)
    {
        $properties = $item->properties;
        $item->properties = [];
        $propertiesResult = [];

        $itemId = $this->save($item, ($item->type !== 'relation')?$item->type:'property', $ontologyId, $ontologyId, $userId);

        //Delete degli oggetti dell'item
        if($item->id)
        {
            $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager');
            $it->load('deleteItemChildren', ['id' => $item->id]);
        }

        foreach ($properties as $property) {

            if(is_string($property->domain[0]->value) || is_string($property->domain[0]))
            {
                if(is_string($property->domain[0]->value))
                {
                    $property->domain = [['id' => $itemId, 'value' => $property->domain[0]->value]];
                }
                else
                {
                    $property->domain = [['id' => $itemId, 'value' => $property->domain[0]]];
                }
            }

            $propId = $this->save($property, OntologyManagerTypeEnum::PROPERTY, $itemId, $ontologyId, $userId);

            if($property->reverseOf)
            {
                //Salvo l'informazione di inversa nella sua inversa
                $inverseProperty = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                            ->where('ontology_uri', $property->reverseOf->id)
                            ->first();
                if($inverseProperty)
                {
                    $inversePropertyData = json_decode($inverseProperty->ontology_data);
                    $inversePropertyData->reverseOf = new \stdClass();
                    $inversePropertyData->reverseOf->id = $propId;
                    $inversePropertyData->reverseOf->type = $property->name->it;
                    $inverseProperty->ontology_data = json_encode($inversePropertyData);
                    $inverseProperty->save();
                }
            }

            if($returnProperties)
            {
                $property->id = $propId;
                $propertiesResult[] = $property;
            }
            if ($property->type == OntologyManagerTypeEnum::RELATION && $top) {
                $this->storeReleationDefinition($property, $ontologyId, $userId);
            }
            $item->properties[] = $property;
        }
        if($returnProperties)
        {
            if($item->copiedProperties)
            {
                foreach($item->copiedProperties as $cp)
                {
                    $prop = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                            ->where('ontology_uri', $cp)->first();
                    if($prop)
                    {
                        $d = json_decode($prop->ontology_data);
                        $d->copied = true;
                        $propertiesResult[] = $d;
                    }
                }
            }
            return ['id' => $itemId, 'uri' =>($item->uri)?:$itemId,'properties' => $propertiesResult];
        }
        else
        {
            return $itemId;
        }
    }

    /**
     * @param ICARICCU\PEB\Models\Entity|StdClass  $entity
     * @param string $ontologyId
     * @param integer $userId
     * @return void
     */
    public function storeEntity($entity, $ontologyId, $userId, $superclassId = null, $type = OntologyManagerTypeEnum::ENTITY)
    {
        if (property_exists($entity, 'deleted')) {
            $this->deletePropertiesFromID($entity->deleted);
        }

        $properties = $entity->properties;
        $entity->properties = [];
        if($superclassId)
        {
            $entity->superclass = new \stdClass();
            $entity->superclass->value = $superclassId;
        }

        $this->save($entity, $type, $ontologyId, $ontologyId, $userId);

        foreach ($properties as $property) {
            $this->save($property, OntologyManagerTypeEnum::PROPERTY, $entity->id, $ontologyId, $userId);
            if ($property->type==OntologyManagerTypeEnum::RELATION) {
                //  TODO da fare solo per la top ontology
                $this->storeReleationDefinition($property, $ontologyId, $userId);
            }
        }
    }

    /**
     * @param ICARICCU\PEB\Models\Relation|StdClass $relation
     * @param string $ontologyId
     * @param integer $userId
     * @return void
     */
    private function storeReleationDefinition($relation, $ontologyId, $userId)
    {
        $relation = (object)[
            'id' => $relation->value->value->id,
            'type' => 'def_relation',
            'name' => $relation->name
        ];
        $this->save($relation, $relation->type, $ontologyId, $ontologyId, $userId);
    }

    /**
     * @param string $id
     * @return void
     */
    public function deleteEntity($id)
    {
        $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager');
        $it->load('deleteEntity', ['id' => $id]);

        $this->deleteFromContentsForm($id);
    }

    /**
     * @param string $id
     * @return void
     */
    public function deleteEntityContents($ontologyId, $superclass)
    {
        $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager');
        $it->load('terminologyBySuperclass', ['ontologyId' => $ontologyId, 'superclass' => $superclass, 'search' => '', 'page' => 1, 'limit' => 0]);

        foreach($it as $ar)
        {
            $ar->delete();
            $this->deleteFromContentsForm($ar->ontology_uri);
        }
    }

    /**
     * @param string $id
     * @return void
     */
    public function deleteTerminology($id)
    {
        $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager');
        $it->load('deleteTerminology', ['id' => $id]);

        $this->deleteFromContentsForm($id);
    }

    /**
     * @param string $id
     * @return void
     */
    public function deleteRelation($id)
    {
        $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager');
        $it->load('deleteRelation', ['id' => $id]);

        $this->deleteFromContentsForm($id);
    }


    /**
     * @param string $id
     * @return void
     */
    public function deleteOntology($id)
    {
        $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager');
        $it->load('deleteOntology', ['id' => $id]);
        $this->solrService->deleteAllDataOfOntologyFromSolr($id);
    }

    /**
     * @param string $id
     * @return void
     */
    public function deleteOntologyContents($id)
    {
        $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager');
        $it->load('deleteOntologyContents', ['id' => $id]);
    }

    public function deleteFromContentsForm($id)
    {
        if($id)
        {
            $cf = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\ContentsForm')
                ->where('id', $id)
                ->first();
            if ($cf) {
                $cf->delete();
                $this->solrService->deleteFromSolr($id);
            }
        }
    }


    /**
     * @param StdClass $data
     * @param string $type
     * @param string $parentId
     * @param string $ontologyId
     * @param integer $userId
     * @return string $uri
     */
    public function save($data, $type, $parentId, $ontologyId, $userId)
    {
        $this->ar->emptyRecord();

        if (is_null($data->name)) {
            $data->name = new Label();
        }
        if($data->id == null)
        {
            $uuid = Uuid::uuid4();
            if($type != 'ontology') {
                $data->id = $this->generateUri($uuid->toString(), $ontologyId);
            }
        }
        $uri = (string)$data->id;
        $r = $this->ar->find(['ontology_uri' => $uri, 'ontology_type' => $type]);
        $this->ar->ontology_uri = $uri;
        $this->ar->ontology_name = json_encode($data->name);
        $this->ar->ontology_creationdate = $this->ar->ontology_creationdate ? $this->ar->ontology_creationdate : new \pinax_types_DateTime();
        $this->ar->ontology_modificationdate = new \pinax_types_DateTime();
        $this->ar->ontology_type = ($type == 'relation') ? 'property' : $type;
        $this->ar->ontology_data = json_encode($data);
        if($data->superclass)
        {
            $superclass = ($data->superclass->value->id) ? $data->superclass->value->id : $data->superclass->value;
        }
        $this->ar->ontology_superclass = ($superclass) ? $superclass : null;
        $this->ar->ontology_from_top = ($data->topEntity) ? true : false;

        $title = ($data->name->it)?:$data->name->get('it');
        $this->saveContentForm($data->content, $uri, $data->superclass->value, $title);

        if($data->uri)
        {
            $this->ar->ontology_real_uri = $data->uri;
        }
        $this->ar->ontology_parentUri = (string)$parentId;
        $this->ar->ontology_group = $ontologyId;
        $this->ar->ontology_FK_user_id = $userId;

        if($data->reverseOf)
        {
            $this->setReverse($data);
        }

        $this->ar->save();

        if($type == 'terminology'){
            $this->solrService->saveOnSolr($this->ar);
            $this->solrService->saveOnSolr($this->ar, null, false);
        }

        return $uri;
    }
    
    private function setReverse($data)
    {
        $reverseId = $data->reverseOf->id;
        $reverseRecord = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                    ->where('ontology_uri',$reverseId)
                    ->first();
    
        $dataReverse = json_decode($reverseRecord->ontology_data);
        if(!$dataReverse->reverseOf)
        {
            $dataReverse->reverseOf = new \stdClass();
            $dataReverse->reverseOf->id = $data->id;
            $dataReverse->reverseOf->type = $data->name->it;
            $reverseRecord->ontology_data = json_encode($dataReverse);
            $reverseRecord->save();
        }
    }

    /**
     * @param array $ids
     * @return void
     */
    private function deletePropertiesFromID($ids) {
        $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager');
        $it->load('deletePropertiesFromID', ['ids' => $ids]);
    }

    public function saveContentForm($content, $id, $entityId, $title)
    {
        $ar = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\ContentsForm')
                ->where('id',$id)
                ->first();
        if(!$ar)
        {
            $ar = \__ObjectFactory::createModel('ICARICCU\PEB\Models\ContentsForm');
        }

        $indexFields = [];
        $values = [];
        if($content){
            foreach($content as $c)
            {
                //Cerco i campi da indicizzare
                if($c->value)
                {
                    if(strpos($c->value->id, 'fieldOpenList') !== false)
                    {
                        $field = $c->id;
                        if($c->multivalue)
                        {
                            $value = [];
                            foreach ($c->items as $i) {
                                $value[] = $i->value->value;
                            }                        
                        }
                        else
                        {
                            $value = current($c->items)->value->value;
                        }
                        $indexFields[$field] = (is_array($value)) ? 'array_id' : 'string';
                        $values[$field] = $value;
                    }
                }
            }
        }

        $content = new \stdClass();
        $ar->id = $id;
        $ar->title = $title;
        $ar->__entityId = $entityId;
        
        if(!$ar->__entityId)
        {
            $ar->__entityId = $id;
        }

        foreach($values as $k => $v)
        {
            $content->$k = $v;
        }
        
        if(!empty((array)$content))
        {
            $ar->content = $content;
        }

        $ar->addFieldsToIndex($indexFields);
        
        try{
            $ar->publish();
        }
        catch(\Exception $e){
            dd($ar->getRawData());
        }
    }

    public function generateUri($uuid, $ontologyUuid = false)
    {
        if(!$ontologyUuid) 
        {
            return \__Config::get('ontologies.baseUri').$uuid;
        }
        else
        {
            return $ontologyUuid . '#' . $uuid;
        }
    }
}
