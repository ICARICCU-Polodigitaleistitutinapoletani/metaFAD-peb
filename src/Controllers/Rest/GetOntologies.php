<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class GetOntologies extends \pinax_rest_core_CommandRest
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
    public function execute()
    {
        $this->check();
        $ontologies = $this->readStorageService->getOntologies($this->userId());
        $result = [];
        foreach($ontologies as $o)
        {
            if($o->topDomain == true)
            {
                $result[] = $o;
            }
        }
        foreach($ontologies as $o)
        {
            if($o->topDomain != true)
            {
                $result[] = $o;
            }
        }
        echo json_encode($result);
        exit;
    }
}
