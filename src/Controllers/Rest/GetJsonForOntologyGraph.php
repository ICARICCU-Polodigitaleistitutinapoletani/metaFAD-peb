<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services;
use ICARICCU\PEB\Services\ExportService;
use ICARICCU\PEB\Services\StorageService;
use ICARICCU\PEB\Services\ReadStorageService;

class GetJsonForOntologyGraph extends \pinax_rest_core_CommandRest
{
    use ControllerTrait;

    private $readStorageService;

    public function __construct($application)
    {
        parent::__construct($application);
        $this->readStorageService = new ReadStorageService();
    }

    /**
     * @param integer $id
     * @return array
     */
    public function execute($uri)
    {
        $this->check();

        $altCache = \__Config::get('altCache', 'cache');

        header('Content-type:application/json;charset=utf-8');

        //NB underscore necessario altrimenti la libreria genera un file con nome random
        $filename = '_' . date('YmdHis');
        if (!file_exists($altCache . '/' . $filename . '.owl')) {
            $exportService = new ExportService(new StorageService(), new ReadStorageService(), false);
            $owl = $exportService->export($uri, true);
            file_put_contents($altCache . '/' . $filename . '.owl', $owl);
        }

        exec('cd ' . $altCache . '; java -jar /opt/app/owl2vowl.jar -file ' . \__Config::get('pathToExportCache', '/opt/app/movio/wwwRoot/admin/cache/') . $filename . '.owl');

        $count = 0;
        while (!file_exists($altCache . '/' . $filename . '.json')) {
            if ($count == 5) {
                echo '{"error":"File not found"}';
                exit;
            }
            $count++;
            sleep(1);
        }

        $output = file_get_contents($altCache . '/' . $filename . '.json');
        unlink($altCache . '/' . $filename . '.json');
        unlink($altCache . '/' . $filename . '.owl');
        $output = str_replace('file:/opt/app/movio/wwwRoot/admin/cache/','',$output);
        echo $output;
        exit;
    }
}
