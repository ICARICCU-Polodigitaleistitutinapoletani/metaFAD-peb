<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class GenerateUriForOntology extends \pinax_rest_core_CommandRest
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
    public function execute($ontologyId)
    {
        $this->check();

        try {
            $ontologyId = rawurldecode(rawurldecode($ontologyId));
            $ontology = $this->readStorageService->getOntology($ontologyId, $this->userId());  
            $validTypes = ['entity','terminology','relation','property'];

            if($ontology->acronym)
            {
                $uri = $ontology->acronym;
            }
            else
            {
                $name = $ontology->name->it;
                $uri = $this->cleanText($name);
            }

            $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
                    ->where('ontology_group',$ontologyId);
            foreach($it as $ar)
            {
                if(!in_array($ar->ontology_type, $validTypes)){
                    continue;
                }
                $recordData = json_decode($ar->ontology_data);
                $recordData->uri = \__Config::get('ontology.uri.common') . $uri . '/'.$ar->ontology_type.'/'.$this->cleanText($recordData->name->it);
                $ar->ontology_data = json_encode($recordData);
                $ar->ontology_real_uri = $recordData->uri;
                $ar->save(null, false, 'PUBLISHED');
            }

            return ['http-status' => 200];    
        } catch (\Exception $e) {
            return ['http-status' => 500];
        }
        
    }

    private function cleanText($text)
    {
        return preg_replace('/[^a-zA-Z0-9]/','_',$text);
    }
}
