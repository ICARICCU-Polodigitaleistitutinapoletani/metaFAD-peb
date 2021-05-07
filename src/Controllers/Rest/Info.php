<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class Info extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $readStorageService;
    
    private $language;

    public function __construct($application)
    {
        parent::__construct($application);

        $this->readStorageService = new ReadStorageService();
        $this->language = $this->language();
        
    }


    /**
     * @param integer $id
     * @return array
     */
    public function execute()
    {
        $this->check();

        $ontologies = $this->readStorageService->filterpeb($this->readStorageService->getOntologies(0), false);
        $relations = $this->readStorageService->relationDefnitions($this->language);
        $terminologies = $this->readStorageService->terminologiesDefnitions($this->language);
        $fieldsDefinitions = $this->readStorageService->fieldsDefnitions($this->language);
        $standardRelations = $this->readStorageService->filterpeb($relations);

        $allOntologies = $this->readStorageService->getOntologies($this->userId());
        
        foreach($allOntologies as $o)
        {
            if($o->topDomain == true)
            {
                $topDomain = $o->id;
            }
        }
        $response = [];
        $response['labels'] = $this->labels();
        $response['top_ontologies'] = [];
        $response['topDomain'] = $topDomain;

        $response['properties'] = [];
        $response['properties']['entity'] = [];
        $response['properties']['entity']['relation'] = $relations;
        $response['properties']['entity']['property'] = $fieldsDefinitions[0]['values'];

        $response['features']['addOntology'] = true;
        $response['features']['addEntity'] = true;
        $response['features']['addTerminology'] = true;
        // $response['features']['enableMerge'] = true;
        
        // $response['features']['addContent'] = true;

        $response['user'] = [];
        $response['user']['type'] = $this->getUserType(); // all | entities | terminologies

        if(\__Config::get('ontologymanager.courseList'))
        {
            $request = \pinax_ObjectFactory::createObject('pinax.rest.core.RestRequest', \__Config::get('meta.solr.core.ubimol') . '/select?q=type_s:"class"&wt=json&rows=99999999');
            $request->setTimeout(1000);
            $request->setAcceptType('application/json');
            $request->execute();
            
            $contents = [];

            $responseSolr = json_decode($request->getResponseBody())->response;
            
            if($responseSolr->docs)
            {
                foreach($responseSolr->docs as $d)
                {
                    $contents[$d->id] = $d->name_s;
                }
            }
        }

        if(\__Config::get('ontologymanager.narrativePaths'))
        {
            $request = \pinax_ObjectFactory::createObject('pinax.rest.core.RestRequest', \__Config::get('peb.solr.url.cms') . '/select?q=type_s:"storia"+OR+"guida"&wt=json&rows=99999999');
            $request->setTimeout(1000);
            $request->setAcceptType('application/json');
            $request->execute();
            
            $contents = [];

            $responseSolr = json_decode($request->getResponseBody())->response;
            
            if($responseSolr->docs)
            {
                foreach($responseSolr->docs as $d)
                {
                    $contents[$d->id] = $d->title_s;
                }
            }
        }

        $response['features']['links'] = [
            'dam' => [
                'url' => str_replace('{instance}',\__Request::get('instance'),\__Config::get('DAM_URL'))
            ],
            'metafad' => [
                'url' => \__Config::get('METAFAD_URL') . 'archivi-Complessi_popup'
            ],
            'metafadAut' => [
                'url' => \__Config::get('METAFAD_URL') . 'archivi-ProdCons_popup'
            ]
        ];

        // echo '<pre>';
        // echo (json_encode($response,  JSON_PRETTY_PRINT));
        // echo '</pre>';
        // exit;
        return $response;
    }

    private function labels()
    {
        return [
                'entity' => 'entità',
                'entities' => 'entità',
                'terminology' => 'terminologia',
                'terminologies' => 'terminologie',
                'content' => 'contenuto',
                'headword' => 'lemma',
                'headwords' => 'lemmi',
                'relation' => 'relazione',
                'relations' => 'relazioni',
                'category' => 'categoria',
                'categories' => 'categorie',
                'property' => 'proprietà',
                'superclass' => 'superclasse',
                'all' =>  'tutto'
        ];
    }

    private function getUserType()
    {
        $user = $this->application->getCurrentUser();
        $ar = \__ObjectFactory::createModel('pinax.models.User');
        $userType = 'all';
        if ($ar->load($user->id)) {
            $userData = $ar->getRawData();
            if (property_exists($userData, 'user_ontologyEditingType')) {
                $userType = $ar->user_ontologyEditingType;
            }
        }
        return $userType;
    }
}
