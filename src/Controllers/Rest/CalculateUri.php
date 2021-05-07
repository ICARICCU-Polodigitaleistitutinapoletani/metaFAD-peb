<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class CalculateUri extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $readStorageService;
    
    public function __construct($application)
    {
        parent::__construct($application);

        $this->readStorageService = new ReadStorageService();
    }

    /**
     * @return string
     */
    public function execute($ontologyId, $type)
    {
        $this->check();
        $text = \__Request::get('text');
        //Verifico che il parametro text sia stato inserito
        if(!$text)
        {
            return ['http-status' => 500];
        }

        $validTypes = ['ontology','entity','terminology','relation','property'];

        //Verifico che il parametro type sia stato inserito e che sia valido
        if(!$type || !in_array($type, $validTypes))
        {
            return ['http-status' => 500];
        }

        try {
            $uriService = \__ObjectFactory::createObject('ICARICCU\PEB\Services\UriService',$this->readStorageService);
            $uri = $uriService->calculateUri($ontologyId, $type, $text);
            return ['uri' => $uri];
        } catch (\Exception $e) {
            return ['http-status' => 500];
        }
        
    }
}
