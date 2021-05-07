<?php
namespace ICARICCU\PEB\Controllers\Rest;

use ICARICCU\PEB\Services;
use ICARICCU\PEB\Services\ImportService;
use ICARICCU\PEB\Services\StorageService;
use ICARICCU\PEB\Services\ReadStorageService;

class Import extends \pinax_rest_core_CommandRest
{
    use \pinax_mvc_core_AuthenticatedCommandTrait;

    /**
     * @param integer $id
     * @return array
     */
    public function execute($file)
    {
        $ontologyId = \__Request::get('ontologyId');
        
        $importService = new ImportService(new StorageService(), new ReadStorageService());
        
        try{
            if(is_resource($zip = zip_open(\__Paths::get('UPLOAD') . $file)))
            {
                $zip = new \ZipArchive;
                $res = $zip->open(\__Paths::get('UPLOAD') . $file);
                if ($res === TRUE) {
                  $zip->extractTo(\__Paths::get('UPLOAD') . $file . '_unzip');
                  $zip->close();
                  $contents = scandir(\__Paths::get('UPLOAD') . $file . '_unzip');
                  foreach($contents as $c){
                      if($c != '.' && $c != '..'){
                        $file = $file . '_unzip/' . $c;
                        break;
                      }
                  }
                } 
            }
            $ontologyId = $importService->import(\__Paths::get('UPLOAD') . $file, $ontologyId);
            $obj = new \stdClass();
            $obj->id = $ontologyId;

            return $obj;
        }
        catch(\Exception $e){
            return ['message' => 'ATTENZIONE: si sono verificati dei problemi nell\'importazione. ' .$e->getMessage() ];
        }
    }
}
