<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class AutocompleteEntities extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;
    
    public function __construct($application)
    {
        parent::__construct($application);
    }

    /**
     * @return array
     */
    public function execute($ontologyId, $value)
    {
        $response = [];

        $ontologyId = rawurldecode(rawurldecode($ontologyId));
        $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
            ->load('onlyEntitiesForOntology', ['ontologyId' => $ontologyId, 
                                                'search' => $value, 
                                                'page' => 0, 
                                                'limit' => 0,
                                                'fromTop' => true]);

        foreach($it as $ar)
        {
            $response[] = array('id' => $ar->ontology_uri, 'value' => json_decode($ar->ontology_name)->it);
        }

        return $response;
    }
}
