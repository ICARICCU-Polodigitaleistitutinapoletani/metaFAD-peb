<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class CleanIndex extends \pinax_rest_core_CommandRest
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
        $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\ContentsForm');
        foreach($it as $ar){
            $id = $ar->id;
            $omRecord = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                            ->where('ontology_uri',$id)->first();
            if(!$omRecord){
                $ar->delete();
            }
        }
        return ['http-status' => 200];
    }
}