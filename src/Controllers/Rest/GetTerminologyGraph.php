<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class GetTerminologyGraph extends \pinax_rest_core_CommandRest
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
        $terminology = $this->getIterator()->load('terminologyByIdOnly', ['terminologyId' => $terminologyId])
            ->first();

        if (!$terminology) {
            return ['http-status' => 404];
        }

        $entitiesList = [];
        $entities = $this->readStorageService->getOnlyEntitiesForOntology($terminology->ontology_parentUri, '', 1, 0);
        foreach ($entities as $e) {
            $entitiesList[$e->id] = $e->name->it;
        }

        $name = json_decode($terminology->ontology_name)->it;
        $graph = 'digraph G {' . PHP_EOL . '"' . $name . '" [label="' . $name . '"];';

        $data = json_decode($terminology->ontology_data);
        $superclass = $entitiesList[$data->superclass->value];

        //Relazione superclass - terminology
        if($superclass)
        {
            $graph .= '"' . $superclass . '" [shape=rect];';
        }
        $graph .= '"' . $name . '" [style = filled];' . PHP_EOL;
        $graph .= '"' . $name . '" [color="0.650 0.200 1.000"];' . PHP_EOL;

        if($superclass)
        {
            $graph .= '"' . $superclass . '"->"' . $name . '";' . PHP_EOL;
        }

        if($data->content)
        {
            foreach ($data->content as $p) {
                if ($p->type == 'relation') {
                    if(!empty($p->items && $p->items[0]->value))
                    {
                        foreach($p->items as $item)
                        {
                            if($item->id)
                            {
                                $relationEntity = $entitiesList[$item->id];
                            }
                            else
                            {
                                if(is_array($item->value)){
                                    $relationEntity = $entitiesList[$item->value[0]->id];
                                }
                                else{
                                    $relationEntity = $entitiesList[$item->value->id];
                                }
                            }
                            if($relationEntity)
                            {
                                $graph .= '"' . $relationEntity . '" [shape=rect];';
                            }
                            $relationName = $p->name->it;

                            if(is_array($item->value)){
                                foreach($item->value as $v)
                                {
                                    if (!is_string($v)) {
                                        $v = $v->value;
                                    }

                                    if($relationEntity)
                                    {
                                        $graph .= '"' . $relationEntity . '"->"' . $v . '";' . PHP_EOL;
                                    }    
                                    $graph .= '"' . $name . '"->"' . $v . '" [label="' . $relationName . '"];' . PHP_EOL;
                                }
                            }
                            else{
                                if (!is_string($item->value)) {
                                    $v = $item->value->value;
                                }

                                if($relationEntity)
                                {
                                    $graph .= '"' . $relationEntity . '"->"' . $v . '";' . PHP_EOL;
                                }    
                                $graph .= '"' . $name . '"->"' . $v . '" [label="' . $relationName . '"];' . PHP_EOL;
                            }
                        }
                    }
                }
            }
        }

        $graph .= '}';

        return $graph;
    }
}
