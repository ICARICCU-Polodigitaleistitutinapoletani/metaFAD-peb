<?php
namespace ICARICCU\PEB;

class OntologyManagerModule
{
    public static function registerModule()
    {
        $moduleVO = \pinax_Modules::getModuleVO();
        $moduleVO->id = 'ICARICCU\PEB';
        $moduleVO->name = __T('Ontology Manager');
        $moduleVO->description = 'Ontology Manager';
        $moduleVO->version = '1.0.0';
        $moduleVO->classPath = 'ICARICCU\PEB';
        $moduleVO->author = 'ICAR - ICCU - Polo Digitale degli istituti culturali di Napoli';
        $moduleVO->authorUrl = '';
        $moduleVO->pluginUrl = '';
        $moduleVO->path = ['path' => __DIR__.'/', 'psr-4' => $moduleVO->classPath];
        //$moduleVO->siteMapAdmin = self::siteMap('OntologyManager');
        \pinax_Modules::addModule( $moduleVO );

        pinax_loadLocale($moduleVO->classPath);
    }


    private static function siteMap($id)
    {
        $pageId = strtolower(str_replace('\\', '.', $id));
        return <<<EOD
<pnx:Page pageType="OntologyManager" id="{$pageId}" value="{i18n:Ontology Manager}" />
EOD;
    }
}