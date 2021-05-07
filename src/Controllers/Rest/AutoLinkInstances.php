<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class AutoLinkInstances extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $readStorageService;
    
    public function __construct($application)
    {
        parent::__construct($application);

        $this->readStorageService = new ReadStorageService();
    }

    public function execute($instanceToLink, $relationId, $typeOfEntity, $creationDate = null)
    {
        $instanceToLink = urldecode($instanceToLink);
        $relationId = urldecode($relationId);
        $typeOfEntity = urldecode($typeOfEntity);

        $instance = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                        ->where('ontology_uri', $instanceToLink)->first();
        if(!$instance){
            return ['http-status' => 500];
        }

        $obj = new \stdClass();
        $obj->id = $instanceToLink;
        $obj->value = json_decode($instance->ontology_name)->it;

        $namedIndividuals = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                            ->where('ontology_superclass', $typeOfEntity);
        if($creationDate){
            $namedIndividuals = $namedIndividuals->where('ontology_creationdate', '%'.$creationDate.'%', 'ILIKE');
        }

        foreach($namedIndividuals as $ni){
            $data = json_decode($ni->ontology_data);
            if($data->content){
                foreach($data->content as $c){
                    if($c->id == $relationId){
                        $c->items[0]->value = [$obj];
                    }
                }
            }
            $ni->ontology_data = json_encode($data);
            $ni->save();
        }

        return ['http-status' => 200];
    }
}