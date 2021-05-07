<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services;
use ICARICCU\PEB\Services\ExportService;
use ICARICCU\PEB\Services\StorageService;
use ICARICCU\PEB\Services\ReadStorageService;

class GetJsonForOntologyGraphFromOwl extends \pinax_rest_core_CommandRest
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
    public function execute()
    {
        header('Content-type:application/json;charset=utf-8');

        //NB underscore necessario altrimenti la libreria genera un file con nome random
        $filename = '_' . date('YmdHis');

        if(!\__Request::get('id'))
        {
            file_put_contents( 'cache/' . $filename .'.owl',\__Request::get('__postBody__'));
        }
        else
        {
            $filePath = '/opt/app/movio/wwwRoot/' . \pinax_Paths::get('APPLICATION_MEDIA_ARCHIVE') . 'Other/' . \__Request::get('id');
            file_put_contents('cache/' . $filename . '.owl', file_get_contents($filePath));
        }

        exec('cd cache; java -jar /opt/app/owl2vowl.jar -file /opt/app/movio/wwwRoot/admin/cache/'. $filename . '.owl');

        $count = 0;
        while(!file_exists( 'cache/' . $filename . '.json'))
        {
            if ($count == 5) {
                echo '{"error":"File not found"}';
                exit;
            }
            $count++;
            sleep(1);
        }

        $output = file_get_contents( 'cache/' . $filename . '.json');
        unlink('cache/' . $filename . '.json');
        unlink('cache/' . $filename . '.owl');
        echo $output;
        exit;
    }
}
