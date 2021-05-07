<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services\ReadStorageService;

class AutocompleteInternalLink extends \pinax_rest_core_CommandRest
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
        $speakingUrlManager = $this->application->retrieveProxy('org.pinaxcms.speakingUrl.Manager');

        $result = $speakingUrlManager->searchDocumentsByTerm($value, '', '', '');

        $response = [];

        foreach ($result as $v) {
            $response[] = array('id' => $v['id'], 'value' => $v['text']);
        }

        return $response;
    }
}
