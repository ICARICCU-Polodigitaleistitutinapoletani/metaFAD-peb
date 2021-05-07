<?php
namespace ICARICCU\PEB\Controllers\Rest;

class PopulateContentsTable extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;
    
    public function __construct($application)
    {
        parent::__construct($application);
    }

    /**
     * @return array
     */
    public function execute($ontologyId)
    {
        $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                ->where('ontology_group', $ontologyId)
                ->where('ontology_uri', $ontologyId, '<>');
        foreach($it as $record){
            $ar = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\ContentsForm')
                ->where('ontologymanager_content_id',$record->ontology_uri)
                ->first();
            if(!$ar)
            {
                $ar = \__ObjectFactory::createModel('ICARICCU\PEB\Models\ContentsForm');
                $ar->ontologymanager_content_id = $record->ontology_uri;
            }

            $data = json_decode($record->ontology_data);

            $ar->ontologymanager_content_type = $data->type;
            $ar->ontologymanager_content_value = $data->name->it;
            if($data->type == 'terminology'){
                $ar->ontologymanager_content_superclass = $data->superclass->value;
            }

            $ar->save();
        }
        return true;
    }
}