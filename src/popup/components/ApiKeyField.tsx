import { useState, type ChangeEvent } from 'react';
import {
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  Link,
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';
import { PROVIDER_CONFIG, Provider } from '../../models';

interface Props {
  provider: Provider;
  value: string;
  showOnboarding: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function ApiKeyField({
  provider,
  value,
  showOnboarding,
  onChange,
}: Props) {
  const [showKey, setShowKey] = useState(false);
  const config = PROVIDER_CONFIG[provider];

  return (
    <FormControl mt={6}>
      <FormLabel>{config.label} API Key</FormLabel>
      <InputGroup size="md">
        <Input
          id={`${provider}-api-key`}
          pr="4.5rem"
          type={showKey ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          aria-label={`${config.label} API Key`}
        />
        <InputRightElement width="4.5rem">
          <Button h="1.75rem" size="xs" onClick={() => setShowKey(k => !k)}>
            {showKey ? 'Hide' : 'Show'}
          </Button>
        </InputRightElement>
      </InputGroup>
      <FormHelperText>
        {showOnboarding ? 'Create' : 'Find'} your API key in{' '}
        <Link href={config.helpUrl} isExternal>
          {config.helpLabel}
          <ExternalLinkIcon mx="2px" mb="3px" />
        </Link>
      </FormHelperText>
    </FormControl>
  );
}
