<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class GetTerminologyDetail extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $readStorageService;

    public function __construct($application)
    {
        parent::__construct($application);

        $this->readStorageService = new ReadStorageService();
    }

    /**
     * @param integer $id
     * @return array
     */
    public function execute($terminologyId)
    {
        $this->check();

        $terminologyId = rawurldecode(rawurldecode($terminologyId));
        $terminology = $this->getIterator()->load('terminologyByIdOnly',['terminologyId' => $terminologyId])
                    ->first();

        if (!$terminology) {
            return ['http-status' => 404];
        }

        $data = json_decode($terminology->ontology_data);
        if (!$data->uri) {
            $data->uri = $data->id;
        }

        if($data->superclass)
        {
            $entityProperties = \__ObjectFactory::createObject('ICARICCU\PEB\Controllers\Rest\GetEntityProperties');
            $result = $entityProperties->execute($data->superclass->value, '');
            if($result->properties){
                foreach($result->properties as $pr){
                    $propertiesForEntity[$pr->id] = $pr;
                }
            }
        }

        if($data->content)
        {
            foreach($data->content as $c)
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

                if($c->type == 'relation' && $c->reverseOf && $c->items[0]->value)
                {
                    $relationInverseId = $c->reverseOf->id;
                    $entityIds = $c->items[0]->value;
                    foreach($entityIds as $eId)
                    {
                        $termIt = $this->getIterator()->where('ontology_uri', $eId->id)
                                        ->first();
                        if($termIt)
                        {
                            $dataT = json_decode($termIt->ontology_data);
                            foreach($dataT->content as $termContent)
                            {
                                if($termContent->id == $relationInverseId)
                                {
                                    if(!$termContent->items[0]->value)
                                    {
                                        $c->items[0]->value = null;
                                    }
                                }
                            }
                        }
                    }
                }
                if(array_key_exists($c->id, $propertiesForEntity))
                {
                    if($c->codomain != $propertiesForEntity[$c->id]->codomain){
                        $c->codomain = $propertiesForEntity[$c->id]->codomain;
                    }
                    unset($propertiesForEntity[$c->id]);
                }

                if(is_array($c->items[0]->value) && $c->type == 'relation')
                {
                    foreach($c->items[0]->value as $k => $v)
                    {
                        $record = $this->getIterator()->where('ontology_uri',$v->id)->first();
                        if(!$record)
                        {
                            unset($c->items[0]->value[$k]);
                        }else{
                            $linkedRecordData = json_decode($record->ontology_data);
                            $c->items[0]->value[$k]->value = $linkedRecordData->name->it;
                        }
                    }
                }
            }

            if(!empty($propertiesForEntity)){
                foreach($propertiesForEntity as $pfe){
                    $pfe->items = [];
                    $pfe->items[] = new \stdClass();
                    $pfe->items[0]->value = null;
                    $data->content[] = $pfe;
                }
            }

        }

        if(!$data->uriName && $data->name->it){
            $data->uriName = $data->name->it;
        }

        return $data;
    }

    /**
     * @return ICARICCU\PEB\Models\OntologyManager
     */
    private function getIterator()
    {
        return \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager');
    }

}
