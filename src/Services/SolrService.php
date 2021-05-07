<?php

namespace ICARICCU\PEB\Services;

class SolrService
{
    private $solrUrl;
    private $documents;
    private $entitiesList;
    private $metaindiceConfig = [];
    private $ontologyName;
    private $instancesList = [];
    //Rimuovere cablatura
    private $dateFields = ['eventoHaData','haDataNascita', 'haDataMorte'];
    private $dateIntervals = ['contestoHaData','organizzazioneHaData'];
    private $solrUrlBE;
    private $solrUrlFE;
    private $solrUrlPEB;

    public function __construct()
    {
        $this->solrUrlBE = \__Config::get('peb.solr.host') . 'solr/metaindice_be/';
        $this->solrUrlFE = \__Config::get('peb.solr.host') . 'solr/metaindice/';
        $this->solrUrlPEB = \__Config::get('peb.solr.host') . 'solr/peb/';
        $this->getConfigFields();
    }

    public function saveOnSolr($doc, $queue = null, $metaindex = true)
    {
        $solrDoc = $this->getDataForSolr($doc, $metaindex);

        $json = array(
            'add' => array(
                'doc' => $solrDoc,
                'boost' => 1.0,
                'overwrite' => true,
                'commitWithin' => 1000
            )
        );

        if ($queue && sizeof($this->documents) < $queue) {
            $this->documents[] = trim(json_encode($json), '{}') . '}';
            return;
        } else if ($queue && sizeof($this->documents) >= $queue) {
            $this->documents[] = trim(json_encode($json), '{}') . '}';
            $json = '{' . implode(',', $this->documents) . ', "commit":{}}';
            $this->documents = [];
        }

        $postBody = is_string($json) ? $json : json_encode($json);
        $this->doRequest($postBody, $metaindex);
    }

    public function getDataForSolr($doc, $metaindex = true)
    {
        $this->checkEntitiesList($doc);
        if(!$this->ontologyName){
            $ontology = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                            ->where('ontology_uri', $doc->ontology_group)
                            ->first();
            $this->ontologyName = json_decode($ontology->ontology_name)->it;
        }

        $solrDoc = new \stdClass();
        $data = json_decode($doc->ontology_data);
        $solrDoc->id = $data->id;
        $solrDoc->name_s = $data->name->it;
        $solrDoc->ontologyId_s = $doc->ontology_group;
        $solrDoc->entity_s = $this->entitiesList[$data->superclass->value];
        $solrDoc->entityId_s = $data->superclass->value;
        $solrDoc->lastModified_s = $doc->ontology_modificationdate;
        $solrDoc->uri_s = $doc->ontology_real_uri;

        if ($data->content) {
            $fulltext = [];
            foreach ($data->content as $c) {
                if ($c->type == 'property') {
                    $items = $c->items;
                    foreach ($items as $i) {
                        if ($i->value) {
                            if (is_string($i->value)) {
                                $fulltext[] = $i->value;
                            } else {
                                foreach ($i->value as $iv) {
                                    $fulltext[] = $iv->value;
                                }
                            }
                        }
                    }
                }
            }
            $solrDoc->text = $fulltext;
        }

        $extraFields = [];
        if ($metaindex) {
            $extraFields = $this->getDataForMetaindice($doc);
            $extraFields->dominio_s = $this->ontologyName;
        } else {
            $extraFields = $this->getDataForPebCore($doc);
            $extraFields->dominio_s = $this->ontologyName;
        }

        if (!empty($extraFields)) {
            foreach ($extraFields as $k => $v) {
                $solrDoc->$k = $v;
            }
        }

        return $solrDoc;
    }

    public function getDataForMetaindice($doc)
    {
        $this->checkEntitiesList($doc);

        $solrDoc = new \stdClass();
        $ontoData = json_decode($doc->ontology_data);

        $fromConfig = [];
        foreach ($this->metaindiceConfig as $field => $config) {
            foreach ($config as $entity => $properties) {
                if ($doc->ontology_superclass == $entity) {
                    foreach ($properties as $property) {
                        $fromConfig[$property][] = $field;
                    }
                }
            }
        }
        if (!empty($fromConfig)) {
            $configuredFields = [];
            if ($ontoData->content) {
                foreach ($ontoData->content as $content) {
                    if ($fromConfig[$content->id]) {
                        foreach ($fromConfig[$content->id] as $field) {
                            $configuredFields[$field][] = $this->getValueFromItem($content->items);
                        }
                    }
                }
            }
        }
        if(!empty($configuredFields)){
            foreach($configuredFields as $field => $values){
                if(!empty($values)){
                    $solrDoc->{$field . '_ss'} = $values;
                }
            }
        }
        
        //Campi indicizzati in automatico
        $solrDoc->denominazione_titolo_s =  $ontoData->name->it;

        //$solrDoc->descrizione_ss = $data->description;

        if($ontoData->content){
            foreach($ontoData->content as $c){
                if($c->type == 'property' && $c->value->type == 'Media'){
                    if(current($c->items)->value){
                        $solrDoc->digitale_i = 1;
                    }
                }
            }   
        }

        //autore : in realtà ora non essendoci la gestione con l'utenza metafad l'utente sarà sempre lo stesso

        $solrDoc->data_creazione_s = $doc->ontology_creationdate;

        $solrDoc->tipologia_s = $this->entitiesList[$ontoData->superclass->value];

        $ontology = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                        ->where('ontology_uri', $doc->ontology_group)
                        ->first();
        if($ontology){
            $solrDoc->ontologyName_s = json_decode($ontology->ontology_name)->it;
        }

        //campo full text con tutti
        $fulltext_txt = [];

        foreach($solrDoc as $field => $value){
            if(is_string($value)){
                $fulltext_txt[] = $value; 
            }
            else{
                if(is_array($value)){
                    $fulltext_txt = array_merge($fulltext_txt, $value);
                }
            }
        }
        $solrDoc->text = $fulltext_txt;
        
        $solrDoc->url_t = 'edit/' . $doc->ontology_group . '/terminologies?terminologyId=' . urlencode($doc->ontology_uri);
        
        return $solrDoc;
    }

    public function getDataForPebCore($doc)
    {
        $this->checkEntitiesList($doc);

        $solrDoc = new \stdClass();
        $ontoData = json_decode($doc->ontology_data);

        $solrDoc->tipologia_s = $this->entitiesList[$ontoData->superclass->value];

        $forDetail = [];
        if($ontoData->content){
            foreach($ontoData->content as $c){
                $type = $c->value->type;
                $fieldName = $c->name->it;

                if($c->type != 'relation'){
                    $values = $this->getValueFromItem($c->items,$type);
                    if($values && !empty($values)){
                        if($type == 'Media' || strpos($type, "Record METAFAD") === 0){
                            $solrDoc->{$fieldName . '_nxss'} = [$values]; 
                        }
                        else{
                            $solrDoc->{$fieldName . '_ss'} = [$values]; 
                            $solrDoc->{$fieldName . '_txt'} = [$values];
                            if(sizeof($values) == 1){
                                //Per sorting
                                $solrDoc->{$fieldName . '_s'} = [$values];
                            }
                        }

                        $forDetail[$fieldName] = [$values];
                    }
                }
                else{
                    if(!empty($c->items) && current($c->items)->value){
                        $objs = [];
                        $ids = [];
                        $names = [];
                        $uris = [];
                        foreach(current($c->items)->value as $element){
                            if(!is_array(current($c->items)->value)){
                                $element = current($c->items)->value;
                            }

                            if(!array_key_exists($element->id, $this->instancesList)){
                                $ar = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                                        ->where('ontology_uri', $element->id)->first();
                                if($ar){
                                    $obj = new \stdClass();
                                    $obj->id = $element->id;
                                    $obj->name = $element->value;
                                    $obj->uri = $ar->ontology_real_uri;
                                    $this->instancesList[$element->id] = $obj;
                                }
                            }
                            else{
                                $obj = $this->instancesList[$element->id];
                            }
                            $ids[] = $obj->id;
                            $names[] = $obj->name;
                            $uris[] = $obj->uri;
                            if(!in_array($obj,$objs)){
                                $objs[] = $obj;
                            }
                        }
                        if(!empty($ids)){
                            $solrDoc->{$fieldName . '_ss'} = array_unique($names);
                            $solrDoc->{$fieldName . '_txt'} = $solrDoc->{$fieldName . '_ss'};
                            $forDetail[$fieldName] = $objs;
                            $solrDoc->{$fieldName . '_id_ss'} = array_unique($ids);
                            $solrDoc->{$fieldName . '_uri_ss'} = array_unique($uris);

                            if(sizeof(array_unique($names)) == 1){
                                //Per sorting
                                if(in_array($fieldName, $this->dateFields)){
                                    $dateString = current(array_unique($names));
                                    $args = explode('_',$dateString);
                                    $args = array_reverse($args);
                                    $solrDoc->{$fieldName . '_dt'} = implode('-', $args) . 'T00:00:00.000Z';
                                }
                                else if(in_array($fieldName, $this->dateIntervals)){
                                    $dateString = current(array_unique($names));
                                    $dates = explode('__', $dateString);

                                    preg_match('(\d{4})',current($dates), $matches);
                                    $solrDoc->{$fieldName . '_start_i'} = current($matches);
                                    preg_match('(\d{4})',end($dates), $matches);
                                    $solrDoc->{$fieldName . '_end_i'} = current($matches);
                                }
                                else{
                                    $solrDoc->{$fieldName . '_s'} = current(array_unique($names));
                                }
                            }
                        }
                    }
                }
            }
        }
        
        if($forDetail){
            $solrDoc->detail_nxt = json_encode($forDetail);
        }

        return $solrDoc;
    }

    public function getValueFromItem($items, $type = null)
    {
        $values = [];

        foreach ($items as $i) {
            if($type == 'Media' || strpos($type, "Record METAFAD") === 0)
            {
                if(is_object($i->value)){
                    $values[] = json_encode($i->value);
                }
                else if($i->value){
                    $values[] = json_encode(current($i->value));
                }
            }
            else if ($i->value) {
                if (is_string($i->value)) {
                    $values[] = $i->value;
                } else if(is_object($i->value)){
                    if($i->value->value){
                        $values[] = $i->value->value;
                    }
                }
                else {
                    foreach ($i->value as $iv) {
                        if($iv->value){
                            $values[] = $iv->value;
                        }
                    }
                }
            }
        }

        if(empty($values)){
            return null;
        }
        if(sizeof($values) == 1){
            return current($values);
        }
        return $values;
    }

    public function getConfigFields()
    {
        $configRecord = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\Metaindice')
            ->first();
        if ($configRecord) {
            $values = $configRecord->getValues(false, true, false, false);
            foreach ($values as $field => $config) {
                if (is_array($config)) {
                    foreach ($config as $c) {
                        if ($c->entity->id) {
                            $entity = $c->entity->id;
                            $properties = [];
                            if ($c->properties) {
                                foreach ($c->properties as $p) {
                                    $properties[] = $p->id;
                                }
                            }
                            if (!array_key_exists($field, $this->metaindiceConfig)) {
                                $this->metaindiceConfig[$field];
                            }
                            $this->metaindiceConfig[$field][$entity] = $properties;
                        }
                    }
                }
            }
        }
    }

    public function checkEntitiesList($doc)
    {
        if (empty($this->entitiesList)) {
            $entitiesList = [];
            $entities = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                ->where('ontology_group', $doc->ontology_group)
                ->where('ontology_type', 'entity');
            foreach ($entities as $e) {
                $entitiesList[$e->ontology_uri] = json_decode($e->ontology_name)->it;
            }
            $this->setEntitiesList($entitiesList);
        }
    }

    public function deleteFromSolr($id, $metaindex = true)
    {
        $json = array(
            'delete' => array('query' => 'id:"' . $id . '"'),
            'commit' => new \StdClass()
        );
        $postBody = json_encode($json);
        $this->doRequest($postBody, $metaindex);
    }

    public function deleteAllDataOfOntologyFromSolr($ontologyId, $metaindex = true)
    {
        $json = array(
            'delete' => array('query' => 'ontologyId_s:"' . $ontologyId . '"'),
            'commit' => new \StdClass()
        );
        $postBody = json_encode($json);
        $this->doRequest($postBody, $metaindex);
    }

    public function getFromSolr($ontologyId, $search, $facet, $page, $limit)
    {
        if (!empty($facet)) {
            $fq = '';
            foreach ($facet as $field => $values) {
                foreach ($values as $v) {
                    $fq .= '&fq=' . $field . ':"' . $v . '"';
                }
            }
        }

        $start = ($page - 1) * $limit;
        $q = '*' . urlencode($search) . '*';

        $request = \pinax_ObjectFactory::createObject(
            'pinax.rest.core.RestRequest',
            $this->solrUrlBE . 'select?q=' . $q . '&fq=ontologyId_s:"' . $ontologyId . '"' . $fq . '&start=' . $start . '&rows=' . $limit . '&sort=name_s+asc&facet=true&facet.field=entity_s&wt=json',
            'POST',
            null,
            'application/json'
        );
        $request->execute();
        $response = json_decode($request->getResponseBody());
        $docs = $response->response->docs;
        $result = [];
        if (!empty($docs)) {
            foreach ($docs as $doc) {
                $result[] = $doc;
            }
        }

        $facets['entity_s'] = ['label' => 'Entità', 'values' => []];
        $ff = $response->facet_counts->facet_fields;
        if ($ff->entity_s) {
            foreach ($ff->entity_s as $k => $value) {
                if (is_array($facet->entity_s) && in_array($value, $facet->entity_s)) {
                    continue;
                }
                if ($ff->entity_s[$k + 1] > 0) {
                    $facets['entity_s']['values'][] = ['value' => $value, 'total' => $ff->entity_s[$k + 1]];
                }
            }
        }
        if (empty($facets['entity_s']['values'])) {
            $facets = new \stdClass();
        }

        return ['results' => $result, 'facets' => $facets, 'tot' => $response->response->numFound];
    }

    private function doRequest($postBody, $metaindex = true)
    {
        $urls = ($metaindex) ? [$this->solrUrlBE,$this->solrUrlFE] : [$this->solrUrlPEB];

        foreach($urls as $url){
            $command = 'update/json';
            $request = \pinax_ObjectFactory::createObject(
                'pinax.rest.core.RestRequest',
                $url . $command . '?wt=json&commit=true',
                'POST',
                $postBody,
                'application/json'
            );
            $request->execute();
        }
    }

    public function commitRemaining($metaindex = true)
    {   
        $json = '{' . implode(',', $this->documents) . ', "commit":{}}';
        $postBody = is_string($json) ? $json : json_encode($json);
        $this->doRequest($postBody, $metaindex);
    }

    public function setEntitiesList($entitiesList)
    {
        $this->entitiesList = $entitiesList;
    }
}
