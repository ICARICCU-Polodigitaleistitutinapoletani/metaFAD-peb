<?php
namespace ICARICCU\PEB\Models;

class Label implements \JsonSerializable
{
    private $values = ['it' => '', 'en' => ''];

    public function add($language, $value)
    {
        if (!$language || !$value) return;
        $this->values[$language] = $value;
    }

    public function get($language)
    {
        return $this->values[$language];
    }

    public function isValid()
    {
        return count($this->values);
    }

    public function jsonSerialize()
    {
        return $this->values;
    }

}