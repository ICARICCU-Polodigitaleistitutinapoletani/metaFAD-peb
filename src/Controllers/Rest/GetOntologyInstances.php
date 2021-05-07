<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class GetOntologyInstances extends \pinax_rest_core_CommandRest
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
    public function execute($ontologyId)
    {
        $ontologyId = urldecode(urldecode($ontologyId));
        $ontology = $this->readStorageService->getOntology($ontologyId, $this->userId());  
        $ontologyLabel = $ontology->name->it;


        $detail = $this->readStorageService->compileOntologyDetail($ontology); 
        
        $instances = [];
        
        foreach($detail->items as $i)
        {
            if ($i->type == 'terminology') 
            {
                $instance = new \stdClass();
                
                $instance->id = urlencode(urlencode($i->id));
                $instance->label = $i->name->it;
                $instance->ontologyId = $ontologyId;
                $instance->ontologyLabel = $ontologyLabel;
                $instances[] = $instance;
            }
        }

        if (!count($instances)) {
            return ['http-status' => 200];
        }

        return $instances;
    }
}
