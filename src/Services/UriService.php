<?php

namespace ICARICCU\PEB\Services;

class UriService
{
    private $readStorageService;


    public function __construct($readStorageService)
    {
        $this->readStorageService = $readStorageService;
    }

    public function calculateUri($ontologyId, $type, $text)
    {
        $ontologyId = rawurldecode(rawurldecode($ontologyId));
        $ontology = $this->readStorageService->getOntology($ontologyId, 1);

        if ($ontology->acronym) {
            $uri = $ontology->acronym;
        } else {
            $name = $ontology->name->it;
            $uri = $this->cleanText($name);
        }

        if ($type !== 'ontology') {
            $uri .= '/' . $type . '/' . $this->cleanText($text);
        }

        $uri = \__Config::get('ontology.uri.common') . $uri;

        $it = \__ObjectFactory::createModelIterator('ICARICCU\PEB\Models\OntologyManager')
            ->where('ontology_real_uri', $uri)
            ->first();
        if (!$it || $it->ontology_real_uri !== $uri) {
            return $uri;
        } else {
            return false;
        }
    }

    private function cleanText($text)
    {
        $text = str_replace(['\'','"','.',',','?','&','#'],'_',$text);
        $unwanted_array = array(    'Š'=>'S', 'š'=>'s', 'Ž'=>'Z', 'ž'=>'z', 'À'=>'A', 'Á'=>'A', 'Â'=>'A', 'Ã'=>'A', 'Ä'=>'A', 'Å'=>'A', 'Æ'=>'A', 'Ç'=>'C', 'È'=>'E', 'É'=>'E',
                            'Ê'=>'E', 'Ë'=>'E', 'Ì'=>'I', 'Í'=>'I', 'Î'=>'I', 'Ï'=>'I', 'Ñ'=>'N', 'Ò'=>'O', 'Ó'=>'O', 'Ô'=>'O', 'Õ'=>'O', 'Ö'=>'O', 'Ø'=>'O', 'Ù'=>'U',
                            'Ú'=>'U', 'Û'=>'U', 'Ü'=>'U', 'Ý'=>'Y', 'Þ'=>'B', 'ß'=>'Ss', 'à'=>'a', 'á'=>'a', 'â'=>'a', 'ã'=>'a', 'ä'=>'a', 'å'=>'a', 'æ'=>'a', 'ç'=>'c',
                            'è'=>'e', 'é'=>'e', 'ê'=>'e', 'ë'=>'e', 'ì'=>'i', 'í'=>'i', 'î'=>'i', 'ï'=>'i', 'ð'=>'o', 'ñ'=>'n', 'ò'=>'o', 'ó'=>'o', 'ô'=>'o', 'õ'=>'o',
                            'ö'=>'o', 'ø'=>'o', 'ù'=>'u', 'ú'=>'u', 'û'=>'u', 'ý'=>'y', 'þ'=>'b', 'ÿ'=>'y' );
        $text = strtr( $text, $unwanted_array );
        $text = preg_replace('/[^a-zA-Z0-9()-]/', '_', $text);
        return $text;
    }
}
