<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class AutocompleteOpenField extends \pinax_rest_core_CommandRest
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
        $value = urldecode($value);
        $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\ContentsForm', 'getIndexValues', array('params' => array('field' => $id, 'value' => '%'.$value.'%')));

        $values = []; 
        if($value)
        {
            $values[] = $value;
        }

        if($it->count())
        {
            foreach($it as $ar)
            {
                $values[] = $ar->document_index_text_value;
            }
        }

        $response = array();

        foreach ($values as $k => $v) {
            $response[] = array('id' => $k, 'value' => $v);
        }

        return $response;
    }
}
