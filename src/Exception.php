<?php
namespace ICARICCU\PEB;

class Exception extends \Exception
{
    public static function ontologyNotFound($id)
    {
        return new self('Ontology not found '.$id);
    }

    public static function entityNotFound($id)
    {
        return new self('Entity not found '.$id);
    }
}
