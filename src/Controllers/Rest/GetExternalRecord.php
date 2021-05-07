<?php
namespace ICARICCU\PEB\Controllers\Rest;

class GetExternalRecord extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    public function __construct($application)
    {
        parent::__construct($application);
    }

    /**
     * @param integer $id
     * @return array
     */
    public function execute($search)
    {
        $this->check();

        if(!$search){
            $search = '*';
        }
        $request = \pinax_ObjectFactory::createObject('pinax.rest.core.RestRequest', \__Config::get('metafad.solr.be') . 'select?q='.$search.'&fl=denominazione_s,id&wt=json&rows=100');
        $request->setTimeout(1000);
        $request->setAcceptType('application/json');
        $request->execute();
                
        $response = [];

        if($request->getResponseInfo()['http_code'] == 200){
            $responseBody = json_decode($request->getResponseBody());
            if($responseBody->response->numFound > 0){
                foreach($responseBody->response->docs as $doc ){
                    $obj = new \stdClass();
                    $obj->id = $doc->id;
                    $obj->value = $doc->denominazione_s;
                    $response[] = $obj;
                }
            }
        }

        echo json_encode($response);
        exit;
    }
}
