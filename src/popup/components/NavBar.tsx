import { Flex, IconButton } from '@chakra-ui/react';
import { ArrowBackIcon, SettingsIcon } from '@chakra-ui/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const NavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isHomePage = location.pathname === '/';

  return (
    <Flex
      as="nav"
      position="absolute"
      top={0}
      left={0}
      align="center"
      justify="space-between"
      padding={4}
      width={'100%'}
    >
      {isHomePage ? (
        // Empty box to take up space and keep the settings icon on the right
        <Flex />
      ) : (
        <IconButton
          icon={<ArrowBackIcon />}
          variant={'ghost'}
          onClick={() => navigate('/')}
          aria-label="Go back to Home"
        />
      )}
      <Flex justifyContent="flex-end">
        {/* Add more icons/buttons here */}
        <IconButton
          icon={<SettingsIcon />}
          variant={'ghost'}
          onClick={() => navigate('/settings')}
          aria-label="Settings"
          isDisabled={location.pathname === '/settings'}
        />
      </Flex>
    </Flex>
  );
};

export default NavBar;
