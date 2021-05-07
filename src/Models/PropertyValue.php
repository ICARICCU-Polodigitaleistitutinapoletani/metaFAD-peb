<?php
namespace ICARICCU\PEB\Models;

class PropertyValue
{
    /**
     * @var PropertyId
     */
    public $id;
    /**
     * @var string
     */
    public $type;

    /**
     * @param PropertyId $id
     * @param string $type
     * @return void
     */
    public function __construct(PropertyId $id, $type)
    {
        $this->id = $id;
        $this->type = $type;
    }
}