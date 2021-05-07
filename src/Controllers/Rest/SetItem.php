<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;
use ICARICCU\PEB\Services\StorageService;
use ICARICCU\PEB\Models\Ontology;
use ICARICCU\PEB\Models\PropertyId;
use ICARICCU\PEB\Models\Label;

class SetItem extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $readStorageService;
    private $storageService;
    
    public function __construct($application)
    {
        parent::__construct($application);

        $this->storageService = new StorageService();
        $this->readStorageService = new ReadStorageService();
    }

    /**
     * @param integer $id
     * @return array
     */
    public function execute($ontologyId)
    {
        $this->check();

        try {
            $ontologyId = rawurldecode(rawurldecode($ontologyId));
            $ontology = $this->readStorageService->getOntology($ontologyId, $this->userId());
        } catch (\Exception $e) {
            return ['http-status' => 404];
        }
        
        $postBody = json_decode(\__Request::getBody());
        $result = new \stdClass();
        $id = $postBody->id;

        if(\__Request::get('ternary')){
            if($postBody->name->it == null){
                $name = $this->calculateTernaryName($postBody);
                if(!$name){
                    return ['uri' => false];
                }
                $ternaryName = new \stdClass();
                $ternaryName->it = $name;

                $uriService = \__ObjectFactory::createObject('ICARICCU\PEB\Services\UriService',$this->readStorageService);
                $uri = $uriService->calculateUri($ontologyId, $postBody->type, $ternaryName->it);
                if($uri == false){
                    return [
                        'uri' => false,
                        'name' => $ternaryName
                    ];
                }
                $postBody->uri = $uri;
                $postBody->name = $ternaryName;
            }
            else{
                $ternaryName = null;
            } 
        }

        if($postBody->removedItems)
        {
            foreach($postBody->removedItems as $relationId => $deletedValues)
            {
                foreach($deletedValues as $deleted)
                {
                    $termToClean = $this->getIterator()->where('ontology_uri',$deleted)->first();
                    if($termToClean)
                    {
                        $ttcData = json_decode($termToClean->ontology_data);
                        if($ttcData->content)
                        {
                            foreach($ttcData->content as $ttcdc)
                            {
                                if($ttcdc->reverseOf)
                                {
                                    if($ttcdc->reverseOf->id == $relationId)
                                    {
                                        if($ttcdc->items[0]->value)
                                        {
                                            foreach($ttcdc->items[0]->value as $kk => $v)
                                            {
                                                if($v->id == $id)
                                                {
                                                    unset($ttcdc->items[0]->value[$kk]);
                                                    $ttcdc->items[0]->value = array_values($ttcdc->items[0]->value);
                                                }
                                            }
                                        }
                                    }
                                }
                                if($ttcdc->symmetric)
                                {
                                    if($ttcdc->id == $relationId)
                                    {
                                        if($ttcdc->items[0]->value)
                                        {
                                            foreach($ttcdc->items[0]->value as $kk => $v)
                                            {
                                                if($v->id == $id)
                                                {
                                                    unset($ttcdc->items[0]->value[$kk]);
                                                    $ttcdc->items[0]->value = array_values($ttcdc->items[0]->value);
                                                }
                                            }
                                        }
                                    }
                                }
                            } 
                        }
                        $termToClean->ontology_data = json_encode($ttcData);
                        $termToClean->save();
                    }
                }
            }
            unset($postBody->removedItems);
        }

        if($postBody->type == 'entity')
        {
            //Pulizia copied
            if($postBody->copiedProperties)
            {
                foreach ($postBody->copiedProperties as $k => $cp)
                {
                    $found = false;
                    foreach($postBody->properties as $p)
                    {
                        if($p->id == $cp)
                        {
                            $found = true;
                            break;
                        }
                    }

                    if(!$found)
                    {
                        unset($postBody->copiedProperties[$k]);
                    }
                }
            }
            if(!$postBody->fromTopOntology)
            {
                $copiedProperties = [];
                //Escludo dal salvataggio le proprietà ereditate
                
                foreach($postBody->properties as $k => $p)
                {    
                    if($p->inherited)
                    {
                        unset($postBody->properties[$k]);
                    }
                    else if($p->copied)
                    {
                        $copiedProperties[] = $p;
                        unset($postBody->properties[$k]);
                    }

                    if($p->errors){
                        unset($postBody->properties[$k]->errors);
                    }
                }

                if(!empty($copiedProperties))
                {
                    $postBody->copiedProperties = [];

                    foreach($copiedProperties as $cp)
                    {
                        //Salvare anche proprietà con nuovo domain nel sistema!
                        $oldCp = $this->getIterator()->where('ontology_uri',$cp->id)->first();
                        if($oldCp)
                        {
                            $oldCpData = json_decode($oldCp->ontology_data);
                            $oldCpData->domain = $cp->domain;
                            $oldCp->ontology_data = json_encode($oldCpData);
                            $oldCp->save();
                        }
                        $postBody->copiedProperties[] = $cp->id;
                    }
                }
            }
            else
            {
                //Svuoto le relazioni/proprietà se l'entità è derivata da una top
                $postBody->properties = [];
                // $postBody->superclass = $postBody->topEntity;
            }
        }

        if(!$postBody->uri)
        {
            $postBody->uri = $this->getUri($postBody->name->it, $postBody->type, $ontology);
        }

        if(!$id)
        {
            $new = true;
            $id = $this->storageService->storeItem($postBody, $ontologyId, $this->userId(), false);
            $this->setNewRelationsByDomain($postBody, $id);
        }
        
        if($postBody->content)
        {
            foreach($postBody->content as $c)
            {
  
                if($c->type == 'relation')
                {
                    $propInfo = $this->getIterator()
                                ->where('ontology_uri', $c->id)
                                ->first();
                    if($propInfo)
                    {
                        $propInfoData = json_decode($propInfo->ontology_data);
                        if($propInfoData->reverseOf)
                        {
                            $c->reverseOf = $propInfoData->reverseOf;
                        }
                    }
                }    

                if($c->type == 'relation' && $c->reverseOf && $c->items[0]->value != null)
                {
                    $items = $c->items[0]->value;
                    $reverseOf = $c->reverseOf->id;
                    foreach($items as $instanceId)
                    {
                        $it = $this->getIterator()
                                ->where('ontology_uri', $instanceId->id)
                                ->first();
                        if(!$it){
                            continue;
                        }
                        $data = json_decode($it->ontology_data);

                        $allProps = $this->getTermDetail($data);
                        foreach($data->content as $dataContent)
                        {
                            if(array_key_exists($dataContent->id, $allProps))
                            {
                                unset($allProps[$dataContent->id]);
                            }
                        }
                        if(!empty($allProps))
                        {
                            foreach($allProps as $ap)
                            {
                                $ap->items = [];
                                $ap->items[] = new \stdClass();
                                $ap->items[0]->value = null;
                                $data->content[] = $ap;
                            }
                        }

                        if($data->content)
                        {
                            foreach($data->content as $dc)
                            {
                                if($dc->id == $reverseOf)
                                {       
                                    $obj = new \stdClass();
                                    $obj->id = $id;
                                    $obj->value = $postBody->name->it;
                                    $obj->readOnly = true;
                                    if(!$dc->items[0]->value)
                                    {
                                        $dc->items[0]->value = $dc->multivalue ? [$obj] : $obj;
                                    }
                                    else
                                    {
                                        $found = false;
                                        foreach($dc->items[0]->value as $ddc)
                                        {
                                            if($ddc->id == $id)
                                            {
                                                $found = true;
                                            }
                                        }
                                        if(!$found)
                                        {
                                            array_push($dc->items[0]->value, $obj);
                                        }
                                    }
                                }
                            }
                        }
                        $it->ontology_data = json_encode($data);
                        $it->save(null, false, 'PUBLISHED');
                    }                    
                }

                if($c->type == 'relation' && $c->symmetric)
                {
                    $simmetricCompiled = false;
                    $items = ($c->items[0]->value)?:$c->items[0];
                    foreach($items as $i)
                    {
                        $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                                ->where('ontology_uri', $i->id)
                                ->first();
                        if($it)
                        {
                            $data = json_decode($it->ontology_data);
                            if($data->content)
                            {
                                foreach($data->content as $dc)
                                {
                                    if($dc->id == $c->id)
                                    {
                                        $obj = new \stdClass();
                                        $obj->id = $id;
                                        $obj->value = $postBody->name->it;
                                        $obj->readOnly = true;
                                        if($dc->items[0]->value == null)
                                        { 
                                            $dc->items[0]->value = $dc->multivalue ? [$obj] : $obj;
                                        }
                                        else
                                        {
                                            $found = false;
                                            foreach($dc->items[0]->value as $v)
                                            {
                                                if($v->id == $id)
                                                {
                                                    $found = true;
                                                    break;
                                                }
                                            }
                                            if(!$found)
                                            {
                                                array_push($dc->items[0]->value, $obj);
                                            }
                                        }
                                        $simmetricCompiled = true;
                                    }
                                }
                            }
                            if(!$simmetricCompiled)
                            {
                                $newProp = unserialize(serialize($c));
                                $newProp->items[0]->value = null;
                                $obj = new \stdClass();
                                $obj->id = $id;
                                $obj->value = $postBody->name->it;
                                $obj->readOnly = true;
                                $newProp->items[0]->value = $c->multivalue ? [$obj] : $obj;
                                $data->content[] = $newProp;
                            }
                            $it->ontology_data = json_encode($data);
                            $it->save(null, false, 'PUBLISHED');
                        }
                    }
                }
            }
        }

        if($postBody->errors){
            unset($postBody->errors);
        }

        if($postBody->type !== 'relation')
        {
            $returnProperties = ($postBody->type == 'entity') ? true : false;
            $itemId = $this->storageService->storeItem($postBody, $ontologyId, $this->userId(), false, $returnProperties);
        }
        else if(!$new && $postBody->type == 'relation')
        {
            $itemId = $this->storageService->storeItem($postBody, $ontologyId, $this->userId(), false);
            $this->setNewRelationsByDomain($postBody, $itemId);
        }
        else
        {
            $itemId = $id;
        }

        if($returnProperties && is_array($itemId))
        {
            return $itemId;
        }
        else if($id && !$new && !\__Request::get('ternary'))
        {
            return $result;
        }
        else
        {
            $result->id = $itemId;
            $result->uri = ($postBody->uri)?:$itemId;
            if($ternaryName){
                $result->name = $ternaryName;
            }
            else if(\__Request::get('ternary')){
                $result->name = $postBody->name;
            }
            return $result;
        }
    }

    private function calculateTernaryName($postBody)
    {
        $name = [];
        if($postBody->content){
            foreach($postBody->content as $c){
                if($c->type == 'relation'){
                    $items = current($c->items);
                    if($items->value == null){
                        continue;
                    }
                    if(!is_array($items->value)){
                        $name[] = $items->value->value;
                    }
                    else{
                        foreach($items->value as $i){
                            $name[] = $i->value;
                        }
                    }
                }
            }
        }
        $name = implode('__',$name);
        return $name;
    }

    private function getUri($text, $type, $ontology)
    {
        $validTypes = ['ontology','entity','terminology','relation','property'];
        if(!$type || !in_array($type, $validTypes))
        {
            return '';
        }
        if($ontology->uri)
        {
            $uri = $ontology->uri;
        }
        else
        {
            $name = $ontology->name->it;
            $uri = \__Config::get('peb.baseUri') . '/' . $this->cleanText($name);
        }
        if($type !== 'ontology')
        {
            $uri .= '/'.$type.'/'.$this->cleanText($text);
        }
        $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
            ->where('ontology_real_uri',$uri)
            ->first();
        if(!$it){
            return $uri;
        }
        else
        {
            return '';
        }
    }

    private function cleanText($text)
    {
        $text = strtolower($text);
        return preg_replace('/[^a-zA-Z0-9]/','_',$text);
    }

    private function setNewRelationsByDomain($postBody, $relationId)
    {
        if($postBody->type == 'relation')
        {
            if($postBody->domain)
            {
                foreach($postBody->domain as $domain)
                {
                    $entity = $this->getIterator()->where('ontology_uri', $domain->id)->first();
                    if($entity)
                    {
                        $entityData = json_decode($entity->ontology_data);
                        if(!$entityData->copiedProperties)
                        {
                            $entityData->copiedProperties = [];
                        }
                        
                        if(!in_array($relationId, $entityData->copiedProperties))
                        {
                            array_push($entityData->copiedProperties, $relationId);
                        }
                    }
                    $entity->ontology_data = json_encode($entityData);
                    $entity->save();
                }
            }
        }
    }

    private function getTermDetail($data)
    {
        $propertiesForEntity = [];
        if($data->superclass)
        {
            $entity = $this->getIterator()->where('ontology_uri', $data->superclass->value)
                        ->first();
            if($entity)
            {
                $properties = $this->getIterator()->load('propertiesForEntity',['ontologyId' => $entity->ontology_parentUri, 'entitiesId' => [$entity->ontology_uri] ]);
                foreach($properties as $p)
                {
                    $propData = json_decode($p->ontology_data);
                    $propertiesForEntity[$propData->id] = $propData;
                }   
            }

            $entityData = json_decode($entity->ontology_data);
            if($entityData->copiedProperties)
            {
                foreach($entityData->copiedProperties as $cp)
                {
                    if(!array_key_exists($cp, $propertiesForEntity))
                    {
                        $propCopied = $this->getIterator()->where('ontology_uri', $cp)
                                        ->first();
                        if($propCopied)
                        {
                            $propertiesForEntity[$cp] = json_decode($propCopied->ontology_data);
                        }
                    }
                }
            }
        }
        return $propertiesForEntity;
    }
}
