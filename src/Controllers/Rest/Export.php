<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services;
use ICARICCU\PEB\Services\ExportService;
use ICARICCU\PEB\Services\StorageService;
use ICARICCU\PEB\Services\ReadStorageService;

class Export extends \pinax_rest_core_CommandRest
{
    use \pinax_mvc_core_AuthenticatedCommandTrait;

    /**
     * @param integer $id
     * @return array
     */
    public function execute($id)
    {
        header("Content-type: text/xml; charset=utf-8");
        // $this->checkPermissionForBackend();

        $exportService = new ExportService(new StorageService(), new ReadStorageService());
        echo $exportService->export($id, \__Request::get('model', false));
        exit;
    }
}
