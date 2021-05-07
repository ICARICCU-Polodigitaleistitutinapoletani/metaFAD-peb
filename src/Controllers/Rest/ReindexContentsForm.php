<?php
namespace ICARICCU\PEB\Controllers\Rest;

class ReindexContentsForm extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $url;
    private $solrService;
    private $storageService;
    
    public function __construct($application)
    {
        $this->storageService = \__ObjectFactory::createObject('ICARICCU\PEB\Services\StorageService');

        parent::__construct($application);
    }

    /**
     * @param integer $id
     * @return array
     */
    public function execute($ontologyId)
    {
        $terminologies = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                ->where('ontology_group',$ontologyId)
                ->where('ontology_type','terminology');
        foreach($terminologies as $terminology){
            $data = json_decode($terminology->ontology_data);
            $this->storageService->saveContentForm($data->content, $terminology->ontology_uri, $terminology->ontology_superclass, $data->name->it);
        }
    }

}
