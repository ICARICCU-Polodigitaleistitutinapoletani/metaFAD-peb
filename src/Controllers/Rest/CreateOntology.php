<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\StorageService;
use ICARICCU\PEB\Models\Ontology;
use ICARICCU\PEB\Models\PropertyId;
use ICARICCU\PEB\Models\Label;

class CreateOntology extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $storageService;
    
    public function __construct($application)
    {
        parent::__construct($application);

        $this->storageService = new StorageService();
    }

    /**
     * @param integer $id
     * @return array
     */
    public function execute($name, $derivedFrom='', $imported=[])
    {
        $this->check();

        $ontology = new Ontology(new PropertyId(), $name);
        $ontology->derivedFrom = $derivedFrom;
        $ontology->imported = $imported;
        $ontology->description = \__Request::get('description');
        $ontology->acronym = \__Request::get('acronym');
        $ontology->reference = \__Request::get('reference');
        $ontology->uri = \__Config::get('ontology.uri.common') . $ontology->acronym . '/';

        //Verifica esistenza ontologia
        $ar = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                ->where('ontology_real_uri', $ontology->uri)
                ->first();
        if($ar){
            return ['message' => 'Ontologia '. $ontology->uri . ' già esistente.'];
        }

        try {
            $this->storageService->storeOntology($ontology, $this->userId());  
            return $ontology;
        } catch (\Exception $e) {
            return ['http-status' => 500];
        }
    }
}
