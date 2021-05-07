<?php

namespace ICARICCU\PEB\Services;

class ExportService
{
    private $properties = [];
    private $relations = [];
    private $entities = [];
    private $entitiesResolve = [];
    private $annotationProperties = [];
    private $derivedFrom;
    private $derivedFromURIs = [];
    private $derivedFromURICleans = [];
    private $instances = [];
    private $uri;
    private $id;
    private $showInstances;
    private $entitiesData = [];
    private $entitiesPropertiesData = [];
    private $propertiesData = [];
    private $terminologiesData = [];
    public $topDomainUuid;

    /**
     * @var ICARICCU\PEB\Services\StorageService
     */
    private $storageService;

    /**
     * @var ICARICCU\PEB\Services\ReadStorageService
     */
    private $readStorageService;

    /**
     * @param ICARICCU\PEB\Services\StorageService $storageService
     * @param ICARICCU\PEB\Services\ReadStorageService $readStorageService
     */
    public function __construct(StorageService $storageService, ReadStorageService $readStorageService, $showInstances = true)
    {
        $this->storageService = $storageService;
        $this->readStorageService = $readStorageService;
        $this->showInstances = $showInstances;
    }


    /**
     * @param string $id
     * @return void
     */
    public function export($id, $model = false)
    {
        ini_set('max_execution_time', 0);
        ini_set('memory_limit', '4096M');

        $os = $this->getIterator()->where('ontology_type','ontology');
        foreach($os as $o){
            $data = json_decode($o->ontology_data);
            if($data->topDomain){
                $this->topDomainUuid = $o->ontology_uri;
                break;
            }
        }

        $onto = $this->readStorageService->getOntology(urldecode($id), 1);
        if ($onto) {
            //Dati ontologia
            $this->id = $onto->id->__get('id');
            $this->uri = ($onto->uri) ?: $id;

            //Entità
            $this->getEntities($id);

            //Proprietà
            $this->getProperties($id);
            $this->setSubProperties();

            //Relazioni
            $this->getRelations($id);
            $this->setInverseRelations();

            //Recupero informazioni eventuali da altre ontologie
            //come entità usate come superclassi e relative proprietà/relazioni
            $this->getOtherEntities();

            //Istanze di classi
            if(!$model){
                $this->getInstances($id);
            }
            
            $component = new \stdClass();

            $component->id = $this->id;
            $component->uri = $this->uri;

            if($this->properties){
                $datatypesMapping = (array)json_decode(\__Config::get('datatypes.mapping'));
                foreach($this->properties as $property){
                    if($datatypesMapping[$property->value->id]){
                        $property->type = $datatypesMapping[$property->value->id];
                    }
                }
            }
            
            $extraNamespaces = null;
            $component->properties = $this->properties;
            $component->annotationProperties = $this->annotationProperties;
            $component->relations = $this->relations;
            $component->entities = $this->entities;
            $component->instances = $this->instances;
            $component->derivedFrom = ($this->derivedFrom);
            $component->derivedFromURIs = $this->derivedFromURIs;
            $component->derivedFromURICleans = $this->derivedFromURICleans;

            $skinClass = \__ObjectFactory::createObject('pinax.template.skin.PHPTAL', 'export.owl', [\__Config::get('pathToExportSkin')]);

            $skinClass->set('Component', $component);
            $output = @$skinClass->execute();

            if (!empty($extraNamespaces)) {
                $output = $this->getRdfHeader($output, $extraNamespaces);
            } else {
                $output = str_replace('attributeExtra="##"', '', $output);
            }
            return $output;
        }
    }

    private function getEntities($ontologyId)
    {
        $entities = $this->readStorageService->getOnlyEntitiesForOntology($ontologyId, '', 1, 0, true);
        foreach ($entities as $entity) {
            $this->entities[$entity->id] = $entity;
        }

        foreach($this->entities as $k => $entity)
        {
            if($entity->superclass && $entity->superclass->value)
            {
                $entity->superclass = $this->entities[$entity->superclass->value]->uri;
                $this->entities[$k] = $entity;
            }
        }
    }

    private function getOtherEntities()
    {
        //Verifico che le entità non siano sottoclassi di entità non trovate
        foreach ($this->entities as $entity) {
            if ($entity->superclass && !array_key_exists($entity->superclass->value, $this->entities)) {
                $superclass = $this->getIterator()->where('ontology_uri', $entity->superclass->value)->first();
                if ($superclass) {
                    $this->entities[$entity->superclass->value] = json_decode($superclass->ontology_data);
                    $entity->superclass = $this->entities[$entity->superclass->value]->uri;
                    $propsRels = $this->getIterator()->where('ontology_parentUri', $entity->superclass->value);
                    foreach ($propsRels as $pr) {
                        if($pr->ontology_type == 'property'){
                            $this->getPropertyData($pr);
                        }
                        else if($pr->ontology_type == 'relations'){
                            $this->getRelationData($pr);
                        }
                    }
                }
            }
        }
    }

    private function getInstances($ontologyId)
    {
        $instances = $this->getIterator()
            ->where('ontology_type', 'terminology')
            ->where('ontology_group', $ontologyId);
        if ($instances) {
            foreach ($instances as $instance) {
                $data = json_decode($instance->ontology_data);
                $obj = new \stdClass();
                $obj->uri = $data->uri;
                $this->instances[$data->id] = $obj;
            }

            foreach ($instances as $instance) {
                $contents = $this->getTerminologyContents($instance);
                $owlContent = '';
                if ($contents->content) {
                    foreach ($contents->content as $content) {
                        if ($content->type == 'property') {
                            if ($this->properties[$content->id]) {
                                $label = end(explode('/',$content->uri));
                                if($content->value->id == 'http://peb.icariccu.it/standard/fieldUrl'){
                                    $typeUrl = 'rdf:datatype="http://www.w3.org/2001/XMLSchema#anyURI"';
                                }
                                else{
                                    $typeUrl = null;
                                }
                                foreach($content->items as $item)
                                {
                                    if($item->value && is_string($item->value))
                                    {
                                        $value = str_replace('&','&amp;',$item->value);
                                        if($typeUrl){
                                            $owlContent .= '<' .$label.' '.$typeUrl.'>' . $value . '</' . $label .'>';
                                        }
                                        else{
                                            $owlContent .= '<' .$label.'>' . $value . '</' . $label .'>';
                                        }
                                    }    
                                }
                            }
                        }
                        if ($content->type == 'relation') {
                            if ($this->relations[$content->id]) {
                                $label = end(explode('/',$content->uri));
                                if($content->items[0]->value) {
                                    foreach($content->items[0]->value as $item)
                                    {
                                        if($item->value)
                                        {
                                            $owlContent .= '<' .$label.' rdf:resource="'.str_replace('"','_',$this->instances[$item->id]->uri).'"/>';
                                        }    
                                    }
                                }
                            }
                        }
                    }
                }
                $data = json_decode($instance->ontology_data);
                $data->content = $owlContent;
                $data->superclass = $this->entities[$data->superclass->value]->uri;
                $data->uri = str_replace('"','_',$data->uri);
                $this->instances[$data->id] = $data;
            }
        }
    }

    private function getProperties($ontologyId)
    {
        $properties = $this->getIterator()
            ->load('propertiesForOntology', ['ontologyId' => $ontologyId]);

        if(!$properties->count()){
            //Probabilmente è derivata in toto dalla Top
            $properties = $this->getIterator()
            ->load('propertiesForOntology', ['ontologyId' => $this->topDomainUuid]);
        }
        foreach ($properties as $p) {
            $this->getPropertyData($p);
        }
    }

    private function getPropertyData($p)
    {
        $data = json_decode($p->ontology_data);
        if ($data->type == 'property') {
            //Il dominio è il parent della property (se c'è)
            if ($p->ontology_parentUri) {
                $domain = new \stdClass();
                $domain->id =  $this->entities[$p->ontology_parentUri]->uri;
                $domain->text = $this->entities[$p->ontology_parentUri]->uri;

                $data->domain = [$domain];
            }
            $this->properties[$data->id] = $data;
        }
    }

    private function getRelations($ontologyId)
    {
        $relations = $this->getIterator()
            ->load('propertiesForOntology', ['ontologyId' => $ontologyId]);

        if(!$relations->count()){
            //Probabilmente è derivata in toto dalla Top
            $relations = $this->getIterator()
            ->load('propertiesForOntology', ['ontologyId' => $this->topDomainUuid]);
        }
        foreach ($relations as $r) {
            $this->getRelationData($r);
        }
    }

    private function setInverseRelations()
    {
        if(!empty($this->relations)){
            foreach($this->relations as $relation){
                if($relation->reverseOf)
                {
                    $relation->reverseOf = $this->relations[$relation->reverseOf->id]->uri;
                }
            }
        }
    }

    private function setSubProperties()
    {
        if(!empty($this->properties)){
            foreach($this->properties as $property){
                if($property->subpropertyOf)
                {
                    $property->subpropertyOf = $this->properties[$property->subpropertyOf->id]->uri;
                }
            }
        }
    }

    private function getRelationData($r)
    {
        $data = json_decode($r->ontology_data);
        if ($data->type == 'relation') {
            if ($data->domain) {
                foreach ($data->domain as $d) {
                    if($this->entities[$d->id]){
                        $d->id = $this->entities[$d->id]->uri;
                    }
                }
            }
            if ($data->codomain) {
                foreach ($data->codomain as $c) {
                    if(!$c){
                        unset($data->codomain);
                    }
                    if($c->id){
                        if($this->entities[$c->id]){
                            $c->id = $this->entities[$c->id]->uri;
                        }
                    }
                }
            }
            $this->relations[$data->id] = $data;
        }
    }

    private function getRdfHeader($output, $extraNamespaces)
    {
        $string = '';
        foreach ($extraNamespaces as $k => $v) {
            $string .= 'xmlns:' . $v . '="' . $k . '" ';
        }

        $string .= 'xml:base="' . $this->id . '" ';

        return str_replace('attributeExtra="##"', $string, $output);
    }

    public function getTerminologyContents($terminology)
    {
        $data = json_decode($terminology->ontology_data);
        if (!$data->uri) {
            $data->uri = $data->id;
        }

        if ($data->superclass) {
            if($this->entitiesData[$data->superclass->value]){
                $entity = $this->entitiesData[$data->superclass->value];
            }
            else{
                $entity = ($this->entitiesData[$data->superclass->value])?:$this->getIterator()->where('ontology_uri', $data->superclass->value)
                    ->first();
                $this->entitiesData[$data->superclass->value] = $entity;
            }
            
            if ($entity) {
                if($this->entitiesPropertiesData[$entity->ontology_uri]){
                    $properties = $this->entitiesPropertiesData[$entity->ontology_uri];
                }
                else{
                    $properties = $this->getIterator()->load('propertiesForEntity', ['ontologyId' => $entity->ontology_parentUri, 'entitiesId' => [$entity->ontology_uri]]);
                    $this->entitiesPropertiesData[$entity->ontology_uri] = $properties;
                }
                $propertiesForEntity = [];
                foreach ($properties as $p) {
                    $propData = json_decode($p->ontology_data);
                    $propertiesForEntity[$propData->id] = $propData;
                }

                $entityData = json_decode($entity->ontology_data);
                if ($entityData->copiedProperties) {
                    foreach ($entityData->copiedProperties as $cp) {
                        if (!array_key_exists($cp, $propertiesForEntity)) {
                            if($this->propertiesData[$cp]){
                                $propCopied = $this->propertiesData[$cp];
                            }
                            else{
                                $propCopied = $this->getIterator()->where('ontology_uri', $cp)
                                    ->first();
                                $this->propertiesData[$cp] = $propCopied;
                            }
                            if ($propCopied) {
                                $propertiesForEntity[$cp] = json_decode($propCopied->ontology_data);
                            }
                        }
                    }
                }
            }
        }

        if ($data->content) {
            foreach ($data->content as $c) {
                if ($c->type == 'relation') {
                    if($this->propertiesData[$c->id]){
                        $propInfo = $this->propertiesData[$c->id];
                    }
                    else{
                        $propInfo = $this->getIterator()->where('ontology_uri', $c->id)->first();
                        $this->propertiesData[$c->id] = $propInfo;
                    }
                    if ($propInfo) {
                        $propInfoData = json_decode($propInfo->ontology_data);
                        if ($propInfoData->reverseOf) {
                            $c->reverseOf = $propInfoData->reverseOf;
                        }
                    }
                }

                if ($c->type == 'relation' && $c->reverseOf && $c->items[0]->value) {
                    $relationInverseId = $c->reverseOf->id;
                    $entityIds = $c->items[0]->value;
                    foreach ($entityIds as $eId) {
                        if($this->terminologiesData[$eId->id]){
                            $termIt = $this->terminologiesData[$eId->id];
                        }
                        else{
                            $termIt = $this->getIterator()->where('ontology_uri', $eId->id)
                                ->first();
                            $this->terminologiesData[$eId->id] = $termIt; 
                        }
                        
                        if ($termIt) {
                            $dataT = json_decode($termIt->ontology_data);
                            foreach ($dataT->content as $termContent) {
                                if ($termContent->id == $relationInverseId) {
                                    if (!$termContent->items[0]->value) {
                                        $c->items[0]->value = null;
                                    }
                                }
                            }
                        }
                    }
                }
                if (array_key_exists($c->id, $propertiesForEntity)) {
                    unset($propertiesForEntity[$c->id]);
                }

                if (is_array($c->items[0]->value)) {
                    foreach ($c->items[0]->value as $k => $v) {
                        if($this->terminologiesData[$v->id]){
                            $record = $this->terminologiesData[$v->id];
                        }
                        else{
                            $record = $this->getIterator()->where('ontology_uri', $v->id)->first();
                            $this->terminologiesData[$eId->id] = $record; 
                        }

                        if (!$record) {
                            unset($c->items[0]->value[$k]);
                        }
                    }
                }
            }

            if (!empty($propertiesForEntity)) {
                foreach ($propertiesForEntity as $pfe) {
                    $pfe->items = [];
                    $pfe->items[] = new \stdClass();
                    $pfe->items[0]->value = null;
                    $data->content[] = $pfe;
                }
            }
        }

        return $data;
    }

    private function getIterator()
    {
        return \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager');
    }
}
