<?php
namespace ICARICCU\PEB\Models;

use Ramsey\Uuid\Uuid;

class PropertyId implements \JsonSerializable
{
    /**
     * @var string
     */
    private $id;
   
    /**
     * @param string $id
     * @return void
     */
    public function __construct($id=null, $ontoUuid=null)
    {
        if (!$id) {
            $uuid = Uuid::uuid4();
            $id = $this->generateUri($uuid->toString(), $ontoUuid);
        }
        $this->id = $id;
    }

    public function __get($key)
    {
        return $this->{$key};
    }


    /**
     * @return string
     */
    public function jsonSerialize()
    {
        return $this->id;
    }

    public function __toString()
    {
        return $this->id;
    }

    public function generateUri($uuid, $ontologyUuid = false)
    {
        if(!$ontologyUuid) 
        {
            return \__Config::get('ontologies.baseUri').$uuid;
        }
        else
        {
            return $ontologyUuid . '#' . $uuid;
        }
    }
}