<template>
  <h3 class="sm:px-6 p-4 text-3xl font-medium text-gray-200">Create Team</h3>

  <div>
    <div>
      <div class="px-6 rounded-md">
        <div>
          <div class="flex mt-4">
            <div>
              <label class="text-gray-200 mr-5 text-lg" for="username"
                >Name:
              </label>
              <input
                class="w-96 p-2 mt-2 bg-zinc-800 border-gray-600 rounded-md focus:border-emerald-600 focus:ring focus:ring-opacity-40 focus:ring-emerald-500"
                type="text"
                v-model="name"
                placeholder="Enter Name"
              />
            </div>
          </div>
        </div>
        <div class="mt-6"></div>

        <div>
          <HoppButtonPrimary :loading="loading" label="Save" @click="addTeam" />
        </div>

        <div class="mt-8"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMutation } from '@urql/vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useReadonlyStream } from '~/composables/stream';
import { auth } from '~/helpers/auth';
import { CreateTeamDocument } from '../../helpers/backend/graphql';

const router = useRouter();
const name = ref('');
const loading = ref(false);

const addTeamMutation = useMutation(CreateTeamDocument);

const currentUser = useReadonlyStream(
  auth.getProbableUserStream(),
  auth.getProbableUser()
);

const addTeam = async () => {
  loading.value = true;
  let payload = {
    name: name.value.trim(),
    userUid: '',
  };

  if (currentUser.value) {
    payload['userUid'] = currentUser.value.uid;
  }

  const { data, error } = await addTeamMutation.executeMutation(payload);
  loading.value = false;

  if (data) {
    name.value = '';
    goToTeamDetailsPage(data.createTeamByAdmin.id);
  }

  if (error) {
    console.log(error);
  }
};

const goToTeamDetailsPage = (teamId: string) => {
  router.push('/teams/' + teamId);
};
</script>
