<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class GetOntologyProperties extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $readStorageService;
    private $entities = [];
    private $readOnlyEntities = [];
    
    public function __construct($application)
    {
        parent::__construct($application);

        $this->readStorageService = new ReadStorageService();
    }

    /**
     * @param integer $id
     * @return array
     */
    public function execute($ontologyId, $type)
    {
        $ontologyId = urldecode(urldecode($ontologyId));
        
        if (!in_array($type,['property','relation'])) {
            return ['http-status' => 500];
        }

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
                    if($data->type == $type)
                    {
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
            if($data->errors){
                unset($data->errors);
            }
            if($data->type == $type)
            {
                if($type == 'relation')
                {
                    $errors = $this->checkRelationDataErrors($data);
                    if($errors){
                        $data->errors = $errors;
                    }
                }
                $result[] = $data;
            }
        }

        if($type == 'relation')
        {
            $result = $this->checkInverse($result);
        }

        if (!count($result)) {
            return ['http-status' => 200];
        }

        if($type == 'relation')
        {
            $this->checkReadOnly($result, $ontologyId);

            foreach($result as $r)
            {
                if($r->codomain)
                {
                    foreach($r->codomain as $k => $codomain)
                    {
                        if(!$this->entities[$codomain->id]){
                            $entity = $this->getIterator()->where('ontology_uri', $codomain->id)->first();
                            if(!$entity)
                            {
                                unset($r->codomain[$k]);
                            }
                            else{
                                $this->entities[$codomain->id] = true;
                            }
                        }
                    }
                }
            }
        }

        if(!$ontology->topDomain)
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
            $propertiesForTop = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                ->load('propertiesForOntology', ['ontologyId' => $topDomain]);
            foreach($propertiesForTop as $pft)
            {
                $pftData = json_decode($pft->ontology_data);
                if($pftData->type == 'relation')
                {
                    $result[] = $pftData;
                }
            } 
        }

        $result = $this->sortRelations($result);

        echo json_encode($result);
        exit;
    }

    public function checkRelationDataErrors($relationData)
    {
        $errors = '';
        
        if($relationData->domain){
            foreach($relationData->domain as $domain){
                if(!$this->entities[$domain->id]){
                    $ar = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                            ->where('ontology_uri',$domain->id)->first();
                    if(!$ar)
                    {
                        $errors .= '<li>Il dominio ' . $domain->value .' non è più valido</li>';
                    }
                    else{
                        $this->entities[$domain->id] = true;
                    }
                }
            }
        }

        if($relationData->reverseOf){
            $ar = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                        ->where('ontology_uri',$relationData->reverseOf->id)->first();
            if(!$ar)
            {
                $errors .= '<li>La relazione inversa ' . $relationData->reverseOf->value .' non è più valida</li>';
            }
        }

        if($relationData->codomain){
            foreach($relationData->codomain as $codomain){
                if(!$this->entities[$codomain->id]){
                    $ar = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                            ->where('ontology_uri',$codomain->id)->first();
                    if(!$ar)
                    {
                        $errors .= '<li>Il codominio ' . $codomain->value .' non è più valido</li>';
                    }
                    else{
                        $this->entities[$codomain->id] = true;
                    }
                }
            }
        }

        if($errors){
            $errors = '<ul>' . $errors .'</ul>';
        }

        return $errors;
    }

    private function checkInverse($relations)
    {
        $inverseToResolve = [];
        foreach($relations as $k => $r)
        {
            if($r->reverseOf)
            {
                $relationObj = new \stdClass();
                $relationObj->id = $r->id;
                $relationObj->type = $r->name->it;
                $inverseToResolve[$r->reverseOf->id] = $relationObj;
            }
        }

        foreach($relations as $r)
        {
            if(array_key_exists($r->id, $inverseToResolve))
            {
                $r->reverseOf = $inverseToResolve[$r->id];
            }
        }

        return $relations;
    }

    private function checkReadOnly($data, $ontologyId)
    {
        foreach($data as $d)
        {
            if($d->domain)
            {
                foreach($d->domain as $domain)
                {
                    if(isset($this->readOnlyEntities[$domain->id])){
                        $domain->readOnly = $this->readOnlyEntities[$domain->id];
                    }
                    else{
                        if(!is_string($domain))
                        {
                            $tot = $this->getIterator()
                                    ->load('terminologyBySuperclass', [
                                    'ontologyId' => $ontologyId,
                                    'superclass' => $domain->id,
                                    'search' => '',
                                    'page' => 1,
                                    'limit' => 0
                                ])->count();
                            if($tot > 0)
                            {
                                $domain->readOnly = true;
                                $this->readOnlyEntities[$domain->id] = true;
                            }
                            else{
                                $this->readOnlyEntities[$domain->id] = false;
                            }
                        }
                    }
                }
            }
            if($d->codomain)
            {
                foreach($d->codomain as $codomain)
                {
                    if($codomain)
                    {
                        if(isset($this->readOnlyEntities[$codomain->id])){
                            $codomain->readOnly = $this->readOnlyEntities[$codomain->id];
                        }
                        else{
                            $tot = $this->getIterator()
                                        ->load('terminologyBySuperclass', [
                                        'ontologyId' => $ontologyId,
                                        'superclass' => $codomain->id,
                                        'search' => '',
                                        'page' => 1,
                                        'limit' => 0
                                    ])->count();
                            if($tot > 0 || $d->readOnly == true)
                            {
                                $codomain->readOnly = true;
                                $this->readOnlyEntities[$codomain->id] = true;
                            }
                            else{
                                $this->readOnlyEntities[$codomain->id] = false;
                            }
                        }
                    }
                }
            }
            if(!$d->domain)
            {
                $entities = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                    ->where('ontology_type', 'entity');
                foreach($entities as $entity)
                {
                    if(isset($this->readOnlyEntities[$entity->ontology_uri])){
                        $d->readOnly = $this->readOnlyEntities[$entity->ontology_uri];
                    }
                    else{
                        $tot = $this->getIterator()
                                    ->load('terminologyBySuperclass', [
                                    'ontologyId' => $ontologyId,
                                    'superclass' => $entity->ontology_uri,
                                    'search' => '',
                                    'page' => 1,
                                    'limit' => 0
                                ])->count();
                        if($tot > 0)
                        {
                            $d->readOnly = true;
                            $this->readOnlyEntities[$entity->ontology_uri] = true;
                        }
                        else{
                            $this->readOnlyEntities[$entity->ontology_uri] = false;
                        }
                    }
                }
            }
        }

        return $data;
    }

    private function sortRelations($result)
    {
        usort($result, function($a, $b)
        {
            return strcasecmp($a->name->it, $b->name->it);
        });
        return $result;
    }
}
