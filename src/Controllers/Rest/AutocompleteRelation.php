<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class AutocompleteRelation extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;
    
    public function __construct($application)
    {
        parent::__construct($application);
    }

    /**
     * @return array
     */
    public function execute($id, $value)
    {
        //Valutare se evitabile mandando dati puliti lato angular
        $id = urldecode(urldecode($id));
        if(strpos($id,'@') !== false && strpos($id, '@multipleRanges') === false)
        {
            $id = end(explode('@',$id));
            $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                ->where('ontology_uri', $id)
                ->first();
        }
        else
        {
            $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                    ->where('ontology_uri',$id)
                    ->first();
        }

        //Estrazione superclassi
        $ontologyId = $it->ontology_group;
        $superclasses = [];
        $entitiesList = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
            ->where('ontology_group', $ontologyId)
            ->where('ontology_type', 'entity');
        foreach ($entitiesList as $s) {
            $p = $this->getProperties($s->ontology_parentUri, $s->ontology_uri, true);
            if($p)
            {
                foreach($p as $sc)
                $superclasses[$sc][] = $s->ontology_uri;
            }
        }

        $ranges = null;
        
        if(!$ranges)
        {
            $data = json_decode($it->ontology_data);
            if($data->codomain)
            {
                foreach($data->codomain as $d)
                {
                    //Verifico che non provenga da riuso
                    $entity = $this->getIterator()->where('ontology_uri',$d->id)->first();
                    if($entity->ontology_from_top)
                    {
                        $od = json_decode($entity->ontology_data);
                        $ranges[] = $od->topEntity->value;
                    }
                    else
                    {
                        $ranges[] = $d->id;
                    }
                    $childrenRanges = $this->recursiveRanges($d->id);
                    if($childrenRanges){
                        $ranges = array_merge($ranges, $childrenRanges);
                    }
                }
            }
        }
        if(!$ranges)
        {
            //Caso particolare in cui non c'è un range definito,
            //prendiamo ogni istanza del sistema
            $ranges[] = '%';
        }
        
        foreach($superclasses as $k => $s)
        {
            if(in_array($k, $ranges))
            {
                $ranges = array_merge($ranges, $s);                
            }
        }

        $response = [];
        if($ranges)
        {
            foreach($ranges as $r)
            {
                $value = urldecode($value);
                $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\ContentsForm')
                        ->where('__entityId',$r,'ILIKE');
                if($it->count())
                {
                    foreach($it as $ar)
                    {
                        if(stripos($ar->title,$value) !== false || !$value)
                        {
                            $response[] = array('id' => $ar->id, 'value' => $ar->title);
                        }
                    }
                }
            }
        }
        echo json_encode($response);
        exit;
    }

    public function recursiveRanges($superclassId)
    {
        $subentities = $this->getIterator()->where('ontology_superclass',$superclassId)
                            ->where('ontology_type','entity');
        if($subentities){
            foreach($subentities as $subentity){
                $ranges[] = $subentity->ontology_uri;
                $childrenRanges = $this->recursiveRanges($subentity->ontology_uri);
                if($childrenRanges){
                    $ranges = array_merge($ranges, $childrenRanges);
                }
            }
        }
        return $ranges;
    }
}
