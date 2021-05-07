<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class GenericAutocomplete extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;
    
    public function __construct($application)
    {
        parent::__construct($application);
    }

    /**
     * @return array
     */
    public function execute($value)
    {
        $value = urldecode($value);
        //TODO questo servizio è TEMPORANEO per restituire 
        //un'ipotetica lista chiave => valore per autocomplete
        $values = array(
            'key1' => 'Italia', 
            'key2' => 'Spagna',
            'key3' => 'Germania',
            'key4' => 'Francia',
            'key5' => 'Congo',
            'key6' => 'Turchia',
            'key7' => 'Iran',
            'key8' => 'Stati Uniti',
            'key9' => 'Canada',
            'key10' => 'Australia'
        );

        $response = array();

        if($value == '')
        {
            foreach ($values as $k => $v) {
                $response[] = array('id' => $k, 'value' => $v);
            }
        }
        else{
            foreach ($values as $k => $v) {
                if (stripos($v, $value) !== false) {
                    $response[] = array('id' => $k, 'value' => $v);
                }
            }
        }

        return $response;
    }
}
