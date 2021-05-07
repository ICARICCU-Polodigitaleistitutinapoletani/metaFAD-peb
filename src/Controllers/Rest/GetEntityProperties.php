<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class GetEntityProperties extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $readStorageService;
    private $properties = [];
    private $resolveEntities = [];

    public function __construct()
    {
        $this->readStorageService = new ReadStorageService();
    }

    /**
     * @param integer $id
     * @return array
     */
    public function execute($entityId, $search)
    {
        $this->check();

        $properties = [];

        $entityId = rawurldecode(rawurldecode($entityId));
        $entity = $this->getIterator()->load('entityByOnlyId',['entityId' => $entityId])
                    ->first();

        if (!$entity) {
            return ['http-status' => 404];
        }

        $this->getProperties($entity->ontology_parentUri, $entityId);

        $data = json_decode($entity->ontology_data);
        $data->properties = $this->properties;

        if($data->superclass)
        {
            $this->getSuperclassesProperties($data);
            $data->properties = $this->properties;
        }

        if($data->topEntity)
        {
            $this->getSuperclassesProperties($data, true);
            $data->properties = $this->properties;
        }

        if($data->copiedProperties)
        {
            foreach($data->copiedProperties as $cp)
            {
                $copiedProperty = $this->getIterator()->where('ontology_uri', $cp)->first();
                $copiedPropertyData = json_decode($copiedProperty->ontology_data);
                if(!$copiedPropertyData->copied)
                {
                    $copiedPropertyData->copied = true;
                }
                $data->properties[] = $copiedPropertyData;
            }
        }

        $data->properties = $this->checkInverse($data->properties);
        //Eventuale check di reverse delle relazioni sull'intera ontologia
        $allPropertiesList = [];
        $missingCandidates = [];
        $propertiesForOntology = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
            ->load('propertiesForOntology', ['ontologyId' => $entity->ontology_group]);
        foreach($propertiesForOntology as $pfo)
        {
            $pfoData = json_decode($pfo->ontology_data);
            if($pfoData->domain && current($pfoData->domain)->id == $entityId){
                $missingCandidates[$pfoData->id] = $pfoData;
            }
            if($pfoData->reverseOf)
            {
                $reverse = new \stdClass();
                $reverse->id = $pfoData->id;
                $reverse->type = $pfoData->name->it;
                $allPropertiesList[$pfoData->reverseOf->id] = $reverse;
            }
        }

        foreach($data->properties as $p)
        {
            if(!$p->reverseOf)
            {
                if(array_key_exists($p->id, $allPropertiesList))
                {
                    $p->reverseOf = $allPropertiesList[$p->id];
                }
            }
        }

        if (!$data->uri) {
            $data->uri = $data->id;
        }

        unset($data->info);

        $propIds = [];
        if($data->properties){
            foreach($data->properties as $p){
                $propIds[] = $p->id;
            }
        }
        
        if(!empty($missingCandidates)){
            foreach($missingCandidates as $k => $m){
                if(!in_array($k, $propIds)){
                    $data->properties[] = $m;
                }
            }
        }

        $uri = [];
        foreach($data->properties as $k => $p){
            if(!in_array($p->uri, $uri)){
                $uri[] = $p->uri;
            }
            else{
                unset($data->properties[$k]);
            }
        }
        $data->properties = array_values($data->properties);

        foreach($data->properties as $property){
            if($property->codomain){
                $existingCodomains = [];
                foreach($property->codomain as $codomain){
                    $existingCodomains[] = $codomain->id;
                }
                $extraCodomains = [];
                foreach($property->codomain as $codomain){
                    $this->extractSubLevels($codomain, $extraCodomains, $existingCodomains);
                }
                if(!empty($extraCodomains)){
                    $property->codomain = array_merge($property->codomain, $extraCodomains);
                }
            }
        }

        return $data;
    }

    private function extractSubLevels($codomain, &$extraCodomains, $existingCodomains)
    {
        $subclasses = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                            ->where('ontology_superclass',$codomain->id)
                            ->where('ontology_type','entity');
        if($subclasses){
            foreach($subclasses as $subclass){
                $extraCodomain = new \stdClass();
                $extraCodomain->id = $subclass->ontology_uri;
                $extraCodomain->value = json_decode($subclass->ontology_name)->it;
                if(!in_array($subclass->ontology_uri, $existingCodomains)){
                    $extraCodomains[] = $extraCodomain;
                }
                $this->extractSubLevels($extraCodomain, $extraCodomains, $extraCodomains);
            }
        }
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
}
