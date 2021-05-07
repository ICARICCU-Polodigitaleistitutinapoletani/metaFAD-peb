<?php
namespace ICARICCU\PEB\Controllers\Web;


class Index extends \pinax_mvc_core_Command
{
    public function execute($search, $textId)
    {
        $this->setComponentsContent('app', [
            'restUrl' => PNX_HOST.'/rest/ontologymanager/',
            'baseRouting' => '/ontology.manager',
            'pebApiUrl' => getenv('PEB_API')
        ]);
    }
}
