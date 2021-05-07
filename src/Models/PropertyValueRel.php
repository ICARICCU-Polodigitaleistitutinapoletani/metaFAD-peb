<?php
namespace ICARICCU\PEB\Models;

class PropertyValueRel extends PropertyValue
{
    /**
     * @var PropertyValue
     */
    public $value;

    /**
     * @param PropertyId $id
     * @param string $type
     * @param PropertyValue $value
     * @return void
     */
    public function __construct(PropertyId $id, $type, PropertyValue $value)
    {
        parent::__construct($id, $type);
        $this->value = $value;
    }
}